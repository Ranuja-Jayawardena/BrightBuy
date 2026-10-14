process.env.NODE_ENV = 'test';
process.env.AWS_S3_BUCKET_NAME = 'brightbuy-media-storage-695945476492';

const adminProductService = require('../src/services/adminProductService');
const adminProductModel = require('../src/models/adminProductModel');
const s3Service = require('../src/services/s3Service');
const mediaCleanupService = require('../src/services/mediaCleanupService');

describe('Fix 6.3: S3 Media Lifecycle, Verification, Concurrency & Recoverable Cleanup', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('1. Presign & Staging Isolation (M2, M3, M4)', () => {
    it('rejects unsupported content types with 400', async () => {
      jest.spyOn(adminProductModel, 'productExists').mockResolvedValue(true);
      await expect(adminProductService.presignImage(12, {
        fileName: 'doc.pdf',
        contentType: 'application/pdf',
      })).rejects.toMatchObject({ status: 400 });
    });

    it('rejects files exceeding 5MB size limit with 413', async () => {
      jest.spyOn(adminProductModel, 'productExists').mockResolvedValue(true);
      await expect(adminProductService.presignImage(12, {
        fileName: 'huge.webp',
        contentType: 'image/webp',
        fileSize: 5242881, // 5MB + 1 byte
      })).rejects.toMatchObject({ status: 413 });
    });

    it('generates presigned PUT URL and creates media_uploads record', async () => {
      jest.spyOn(adminProductModel, 'productExists').mockResolvedValue(true);
      const createUploadSpy = jest.spyOn(adminProductModel, 'createMediaUpload').mockResolvedValue({
        upload_id: '550e8400-e29b-41d4-a716-446655440000',
        product_id: 12,
        status: 'pending',
      });

      const result = await adminProductService.presignImage(12, {
        fileName: 'photo.webp',
        contentType: 'image/webp',
        fileSize: 102400,
      }, 5);

      expect(result).toHaveProperty('uploadId');
      expect(result.stagingKey).toMatch(/^uploads\/12\/[a-f0-9-]+\.webp$/);
      expect(result.finalKey).toMatch(/^products\/12\/[a-f0-9-]+\.webp$/);
      expect(result.method).toBe('PUT');
      expect(result.requiredHeaders).toEqual({ 'Content-Type': 'image/webp' });
      expect(createUploadSpy).toHaveBeenCalledWith(expect.objectContaining({
        product_id: 12,
        issuer_id: 5,
        expected_mime: 'image/webp',
        expected_size: 102400,
      }));
    });
  });

  describe('2. Confirmation, Byte Inspection & Replay Contract (M4, M8, F6-04)', () => {
    const uploadId = '550e8400-e29b-41d4-a716-446655440000';
    const stagingKey = `uploads/12/${uploadId}.webp`;
    const finalKey = `products/12/${uploadId}.webp`;
    const finalUrl = `https://brightbuy-media-storage-695945476492.s3.us-east-1.amazonaws.com/${finalKey}`;

    it('idempotently replays already completed upload without re-inserting row (200 Replay)', async () => {
      jest.spyOn(adminProductModel, 'productExists').mockResolvedValue(true);
      jest.spyOn(adminProductModel, 'getMediaUpload').mockResolvedValue({
        upload_id: uploadId,
        product_id: 12,
        status: 'completed',
        image_id: 88,
        final_key: finalKey,
      });
      jest.spyOn(adminProductModel, 'getImageById').mockResolvedValue({
        image_id: 88,
        product_id: 12,
        image_url: finalUrl,
        sort_order: 0,
        is_primary: true,
      });

      const result = await adminProductService.createImage(12, { uploadId });
      expect(result.isReplay).toBe(true);
      expect(result.image.image_id).toBe(88);
      expect(result.image.image_url).toBe(finalUrl);
    });

    it('rejects expired upload authorization with 400', async () => {
      jest.spyOn(adminProductModel, 'productExists').mockResolvedValue(true);
      jest.spyOn(adminProductModel, 'getMediaUpload').mockResolvedValue({
        upload_id: uploadId,
        product_id: 12,
        status: 'pending',
        expires_at: new Date(Date.now() - 10000).toISOString(), // expired
      });

      await expect(adminProductService.createImage(12, { uploadId }))
        .rejects.toMatchObject({ status: 400, message: 'Upload authorization has expired.' });
    });

    it('rejects confirmation if upload is currently leased by another worker (409 Conflict)', async () => {
      jest.spyOn(adminProductModel, 'productExists').mockResolvedValue(true);
      jest.spyOn(adminProductModel, 'getMediaUpload').mockResolvedValue({
        upload_id: uploadId,
        product_id: 12,
        status: 'verifying',
        expires_at: new Date(Date.now() + 60000).toISOString(),
      });

      await expect(adminProductService.createImage(12, { uploadId }))
        .rejects.toMatchObject({ status: 409 });
    });

    it('verifies staging bytes, promotes to final key, and finalizes image row', async () => {
      jest.spyOn(adminProductModel, 'productExists').mockResolvedValue(true);
      jest.spyOn(adminProductModel, 'getMediaUpload').mockResolvedValue({
        upload_id: uploadId,
        product_id: 12,
        status: 'pending',
        staging_key: stagingKey,
        final_key: finalKey,
        expected_mime: 'image/webp',
        expected_size: 50000,
        expires_at: new Date(Date.now() + 60000).toISOString(),
      });
      jest.spyOn(adminProductModel, 'claimMediaUploadLease').mockResolvedValue({ upload_id: uploadId });
      jest.spyOn(s3Service, 'verifyAndPromoteStagingObject').mockResolvedValue({
        finalKey,
        publicUrl: finalUrl,
        size: 50000,
      });
      jest.spyOn(adminProductModel, 'finalizeMediaUpload').mockResolvedValue({
        image_id: 99,
        product_id: 12,
        image_url: finalUrl,
        sort_order: 0,
        is_primary: true,
      });

      const result = await adminProductService.createImage(12, {
        uploadId,
        sort_order: 0,
        is_primary: true,
      });

      expect(result.image.image_id).toBe(99);
      expect(result.image.image_url).toBe(finalUrl);
      expect(s3Service.verifyAndPromoteStagingObject).toHaveBeenCalledWith({
        stagingKey,
        finalKey,
        expectedMime: 'image/webp',
        expectedSize: 50000,
      });
      expect(adminProductModel.finalizeMediaUpload).toHaveBeenCalledWith({
        upload_id: uploadId,
        product_id: 12,
        final_url: finalUrl,
        staging_key: stagingKey,
        sort_order: 0,
        is_primary: true,
      });
    });

    it('marks upload failed if S3 verification fails', async () => {
      jest.spyOn(adminProductModel, 'productExists').mockResolvedValue(true);
      jest.spyOn(adminProductModel, 'getMediaUpload').mockResolvedValue({
        upload_id: uploadId,
        product_id: 12,
        status: 'pending',
        staging_key: stagingKey,
        final_key: finalKey,
        expected_mime: 'image/webp',
        expected_size: 50000,
        expires_at: new Date(Date.now() + 60000).toISOString(),
      });
      jest.spyOn(adminProductModel, 'claimMediaUploadLease').mockResolvedValue({ upload_id: uploadId });
      jest.spyOn(s3Service, 'verifyAndPromoteStagingObject').mockRejectedValue(new Error('Corrupt magic bytes'));
      const failSpy = jest.spyOn(adminProductModel, 'failMediaUpload').mockResolvedValue();

      await expect(adminProductService.createImage(12, { uploadId }))
        .rejects.toThrow('Corrupt magic bytes');
      expect(failSpy).toHaveBeenCalledWith(uploadId);
    });
  });

  describe('3. Recoverable Deletion & Seed Protection (M6, F6-05)', () => {
    it('deletes image row and enqueues cleanup job in background', async () => {
      const deleteModelSpy = jest.spyOn(adminProductModel, 'deleteImage').mockResolvedValue({
        image_id: 42,
        product_id: 12,
        image_url: 'https://brightbuy-media-storage-695945476492.s3.us-east-1.amazonaws.com/products/12/uuid.webp',
      });
      const processJobsSpy = jest.spyOn(mediaCleanupService, 'processPendingJobs').mockResolvedValue(1);

      const result = await adminProductService.deleteImage(42);
      expect(result).toEqual({ image: expect.objectContaining({ image_id: 42 }) });
      expect(deleteModelSpy).toHaveBeenCalledWith(42);
      expect(processJobsSpy).toHaveBeenCalled();
    });

    it('protects shared seed catalog assets from S3 deletion', async () => {
      const s3DeleteSpy = jest.spyOn(s3Service, 'deleteS3Object');

      // Calling deleteS3Object on primary.webp should no-op
      await s3Service.deleteS3Object('products/1/primary.webp');
      expect(s3DeleteSpy).toHaveBeenCalledWith('products/1/primary.webp');
      // Verify isProtectedSeedKey returns true
      expect(s3Service.isProtectedSeedKey('products/1/primary.webp')).toBe(true);
    });

    it('cleanup worker processes pending queue and marks jobs completed', async () => {
      jest.spyOn(adminProductModel, 'claimPendingCleanupJobs').mockResolvedValue([
        { job_id: 1, s3_key: 'uploads/12/temp.webp', reason: 'staging_cleanup', attempts: 1 },
        { job_id: 2, s3_key: 'products/1/primary.webp', reason: 'image_deletion', attempts: 1 }, // seed asset
      ]);
      const deleteS3Spy = jest.spyOn(s3Service, 'deleteS3Object').mockResolvedValue();
      const completeSpy = jest.spyOn(adminProductModel, 'completeCleanupJob').mockResolvedValue();

      const processedCount = await mediaCleanupService.processPendingJobs();
      expect(processedCount).toBe(2);
      // Temp file deleted via S3
      expect(deleteS3Spy).toHaveBeenCalledWith('uploads/12/temp.webp');
      // Both jobs completed
      expect(completeSpy).toHaveBeenCalledWith(1);
      expect(completeSpy).toHaveBeenCalledWith(2);
    });

    it('cleanup worker schedules retry with backoff upon S3 network error', async () => {
      jest.spyOn(adminProductModel, 'claimPendingCleanupJobs').mockResolvedValue([
        { job_id: 3, s3_key: 'uploads/12/failing.webp', reason: 'staging_cleanup', attempts: 1 },
      ]);
      jest.spyOn(s3Service, 'deleteS3Object').mockRejectedValue(new Error('S3 503 SlowDown'));
      const failJobSpy = jest.spyOn(adminProductModel, 'failCleanupJob').mockResolvedValue();

      await mediaCleanupService.processPendingJobs();
      expect(failJobSpy).toHaveBeenCalledWith(3, 'S3 503 SlowDown', expect.any(Number));
    });
  });

  afterAll(() => {
    mediaCleanupService.stopCleanupWorker();
  });
});
