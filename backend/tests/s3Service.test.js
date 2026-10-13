const s3Service = require('../src/services/s3Service');

beforeAll(() => {
  process.env.AWS_S3_BUCKET_NAME = 'brightbuy-media-storage-695945476492';
});

test('accepts only canonical object URLs under the requested product', () => {
  const base = 'https://brightbuy-media-storage-695945476492.s3.us-east-1.amazonaws.com/products/12/';
  expect(s3Service.keyFromPublicUrl(`${base}550e8400-e29b-41d4-a716-446655440000.webp`, 12))
    .toBe('products/12/550e8400-e29b-41d4-a716-446655440000.webp');
  expect(s3Service.keyFromPublicUrl(`${base}primary.webp`, 12)).toBe('products/12/primary.webp');
  expect(s3Service.keyFromPublicUrl(`${base}primary.webp?extra=1`, 12)).toBeNull();
  expect(s3Service.keyFromPublicUrl(`${base}primary.webp`, 13)).toBeNull();
  expect(s3Service.keyFromPublicUrl('https://evil.example/products/12/primary.webp', 12)).toBeNull();
});

test('distinguishes protected seed keys from dynamic product assets', () => {
  expect(s3Service.isProtectedSeedKey('products/1/primary.webp')).toBe(true);
  expect(s3Service.isProtectedSeedKey('products/40/secondary.webp')).toBe(true);
  expect(s3Service.isProtectedSeedKey('products/12/550e8400-e29b-41d4-a716-446655440000.webp')).toBe(false);
  expect(s3Service.isProtectedSeedKey('uploads/12/temp.webp')).toBe(false);
  expect(s3Service.isProtectedSeedKey(null)).toBe(false);
});

test('validates authoritative magic bytes across allowed formats', () => {
  // 1. JPEG
  const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01]);
  expect(s3Service.validateMagicBytes(jpegHeader, 'image/jpeg')).toBe(true);
  expect(s3Service.validateMagicBytes(jpegHeader, 'image/png')).toBe(false);

  // 2. PNG
  const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D]);
  expect(s3Service.validateMagicBytes(pngHeader, 'image/png')).toBe(true);
  expect(s3Service.validateMagicBytes(pngHeader, 'image/webp')).toBe(false);

  // 3. WebP (RIFF....WEBP)
  const webpHeader = Buffer.from('RIFF\x1a\x00\x00\x00WEBPVP8 ', 'binary');
  expect(s3Service.validateMagicBytes(webpHeader, 'image/webp')).toBe(true);
  expect(s3Service.validateMagicBytes(webpHeader, 'image/jpeg')).toBe(false);

  // 4. Invalid / spoofed
  const textBuffer = Buffer.from('<!DOCTYPE html><html>', 'utf8');
  expect(s3Service.validateMagicBytes(textBuffer, 'image/webp')).toBe(false);
  expect(s3Service.validateMagicBytes(Buffer.alloc(5), 'image/jpeg')).toBe(false);
  expect(s3Service.validateMagicBytes(null, 'image/jpeg')).toBe(false);
});

test('generates presigned upload URL with staging isolation and metadata', async () => {
  const result = await s3Service.generatePresignedUploadUrl({
    productId: 15,
    contentType: 'image/webp',
    uploadId: '12345678-1234-1234-1234-123456789abc',
  });

  expect(result.uploadId).toBe('12345678-1234-1234-1234-123456789abc');
  expect(result.stagingKey).toBe('uploads/15/12345678-1234-1234-1234-123456789abc.webp');
  expect(result.finalKey).toBe('products/15/12345678-1234-1234-1234-123456789abc.webp');
  expect(result.method).toBe('PUT');
  expect(result.requiredHeaders).toEqual({ 'Content-Type': 'image/webp' });
  expect(result.uploadUrl).toContain('uploads/15/12345678-1234-1234-1234-123456789abc.webp');
  expect(result.publicUrl).toBe('https://brightbuy-media-storage-695945476492.s3.us-east-1.amazonaws.com/products/15/12345678-1234-1234-1234-123456789abc.webp');
  expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(Date.now());
});
