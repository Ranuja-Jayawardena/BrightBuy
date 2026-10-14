require('dotenv').config();
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { generatePresignedUploadUrl, objectExists, deleteS3Object } = require('../src/services/s3Service');

const region = process.env.AWS_REGION || 'us-east-1';
const bucket = process.env.AWS_S3_BUCKET_NAME || 'brightbuy-media-storage-695945476492';
const s3Client = new S3Client({ region });

test('T05: Environment configuration and credentials resolution', async () => {
  assert.ok(process.env.AWS_REGION, 'AWS_REGION must be defined');
  assert.ok(process.env.AWS_S3_BUCKET_NAME, 'AWS_S3_BUCKET_NAME must be defined');
  assert.equal(process.env.AWS_REGION, 'us-east-1');
  assert.equal(process.env.AWS_S3_BUCKET_NAME, 'brightbuy-media-storage-695945476492');

  // Verify SDK credentials provider can resolve active credentials
  const credentials = await s3Client.config.credentials();
  assert.ok(credentials.accessKeyId, 'Credentials must contain accessKeyId');
  assert.ok(credentials.secretAccessKey, 'Credentials must contain secretAccessKey');

  // If in production container, verify static keys are not in environment (uses IAM role via IMDSv2)
  if (process.env.NODE_ENV === 'production') {
    assert.equal(process.env.AWS_ACCESS_KEY_ID, undefined, 'Production must not use static AWS_ACCESS_KEY_ID');
    assert.equal(process.env.AWS_SECRET_ACCESS_KEY, undefined, 'Production must not use static AWS_SECRET_ACCESS_KEY');
    assert.ok(credentials.sessionToken, 'Instance role temporary credentials must include sessionToken');
    assert.ok(credentials.accessKeyId.startsWith('ASIA'), 'Instance role credentials must start with ASIA prefix');
  }
});

test('T05: S3 staging isolation - public reads restricted to products/* only', async () => {
  const isolationKey = `uploads/isolation-test-${crypto.randomUUID()}.txt`;
  
  // Write private staging object directly via authenticated SDK client
  await s3Client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: isolationKey,
    Body: 'staging private data',
    ContentType: 'text/plain',
  }));

  try {
    // Verify unauthenticated GET to uploads/* is FORBIDDEN (403)
    const publicStagingUrl = `https://${bucket}.s3.${region}.amazonaws.com/${isolationKey}`;
    const response = await fetch(publicStagingUrl);
    assert.equal(response.status, 403, `Unauthenticated read to ${publicStagingUrl} must be HTTP 403 Forbidden`);
  } finally {
    // Cleanup staging object
    await s3Client.send(new DeleteObjectCommand({
      Bucket: bucket,
      Key: isolationKey,
    }));
  }
});

test('T05: End-to-end disposable object lifecycle (presign, PUT, HEAD, public GET, DELETE)', async () => {
  const testProductId = 999999;
  const { uploadUrl, fileKey, publicUrl } = await generatePresignedUploadUrl({
    productId: testProductId,
    contentType: 'image/webp',
  });

  assert.ok(uploadUrl.includes('X-Amz-Signature'), 'Presigned URL must contain AWS SigV4 signature');
  assert.ok(fileKey.startsWith(`products/${testProductId}/`), 'File key must reside under products/{productId}/');

  // 1. Upload via presigned PUT URL
  const dummyWebpBuffer = Buffer.from('RIFF\x1a\x00\x00\x00WEBPVP8 \x0e\x00\x00\x00\x30\x01\x00\x9d\x01\x2a\x01\x00\x01\x00\x02\x00\x34\x25\xa4\x00', 'binary');
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/webp' },
    body: dummyWebpBuffer,
  });
  assert.equal(uploadResponse.status, 200, `Presigned PUT upload must succeed with 200, got ${uploadResponse.status}`);

  // 2. HEAD object existence and encryption check
  const exists = await objectExists(fileKey);
  assert.equal(exists, true, 'Uploaded object must exist according to objectExists (HEAD)');

  const headResult = await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: fileKey }));
  assert.equal(headResult.ServerSideEncryption, 'AES256', 'Server side encryption must be AES256 (SSE-S3)');
  assert.equal(headResult.ContentType, 'image/webp', 'Content-Type must be image/webp');

  // 3. Public unauthenticated GET delivery
  const publicResponse = await fetch(publicUrl);
  assert.equal(publicResponse.status, 200, `Public catalog image delivery must be 200 OK, got ${publicResponse.status}`);
  assert.equal(publicResponse.headers.get('content-type'), 'image/webp');

  // 4. Delete disposable object
  await deleteS3Object(fileKey);

  // 5. Verify deletion
  const existsAfterDelete = await objectExists(fileKey);
  assert.equal(existsAfterDelete, false, 'Object must not exist after delete');

  // Repeat delete is safe (idempotent)
  await deleteS3Object(fileKey);
});

test('T05: Browser CORS preflight verification for allowed and rejected origins', async () => {
  const s3Url = `https://${bucket}.s3.${region}.amazonaws.com/products/1/primary.webp`;

  // 1. EC2 public IP origin
  const ec2OriginResponse = await fetch(s3Url, {
    method: 'OPTIONS',
    headers: {
      'Origin': 'http://18.208.53.186',
      'Access-Control-Request-Method': 'PUT',
      'Access-Control-Request-Headers': 'content-type',
    },
  });
  assert.equal(ec2OriginResponse.status, 200, 'Preflight for http://18.208.53.186 must return 200');
  assert.equal(ec2OriginResponse.headers.get('access-control-allow-origin'), 'http://18.208.53.186');

  // 2. Local development origin (http://localhost:3000)
  const localOriginResponse = await fetch(s3Url, {
    method: 'OPTIONS',
    headers: {
      'Origin': 'http://localhost:3000',
      'Access-Control-Request-Method': 'PUT',
      'Access-Control-Request-Headers': 'content-type',
    },
  });
  assert.equal(localOriginResponse.status, 200, 'Preflight for http://localhost:3000 must return 200');
  assert.equal(localOriginResponse.headers.get('access-control-allow-origin'), 'http://localhost:3000');

  // 3. Unauthorized origin
  const unauthOriginResponse = await fetch(s3Url, {
    method: 'OPTIONS',
    headers: {
      'Origin': 'http://unauthorized-attacker-site.com',
      'Access-Control-Request-Method': 'PUT',
      'Access-Control-Request-Headers': 'content-type',
    },
  });
  assert.notEqual(
    unauthOriginResponse.headers.get('access-control-allow-origin'),
    'http://unauthorized-attacker-site.com',
    'Unauthorized origin must not receive Access-Control-Allow-Origin header'
  );
});

test('T05: Seed catalog media public HTTP delivery', async () => {
  const seedKeys = [
    'products/1/primary.webp',
    'products/1/secondary.webp',
    'products/2/primary.webp',
    'products/3/primary.webp',
    'products/5/primary.webp',
  ];

  for (const key of seedKeys) {
    const url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    const res = await fetch(url);
    assert.equal(res.status, 200, `Seed asset ${key} must return HTTP 200 OK`);
    assert.equal(res.headers.get('content-type'), 'image/webp', `Seed asset ${key} must be image/webp`);
    assert.ok(parseInt(res.headers.get('content-length') || '0', 10) > 0, `Seed asset ${key} must have content length > 0`);
  }
});
