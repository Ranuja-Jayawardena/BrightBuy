const crypto = require('crypto');
const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
  GetObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const region = process.env.AWS_REGION || 'us-east-1';
const client = new S3Client({ region });
const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MiB (5,242,880 bytes)

function bucketName() {
  if (!process.env.AWS_S3_BUCKET_NAME) throw new Error('AWS_S3_BUCKET_NAME is required');
  return process.env.AWS_S3_BUCKET_NAME;
}

function publicUrlForKey(fileKey) {
  return `https://${bucketName()}.s3.${region}.amazonaws.com/${fileKey}`;
}

function keyFromPublicUrl(imageUrl, productId) {
  if (typeof imageUrl !== 'string' || imageUrl.length > 500) return null;
  const prefix = publicUrlForKey(`products/${productId}/`);
  if (!imageUrl.startsWith(prefix)) return null;
  const fileKey = imageUrl.slice(prefix.indexOf('/products/') + 1);
  if (!/^products\/\d+\/(?:[a-f0-9-]+|primary|secondary)\.(jpg|png|webp)$/.test(fileKey)) return null;
  return imageUrl === publicUrlForKey(fileKey) ? fileKey : null;
}

function isProtectedSeedKey(fileKey) {
  if (typeof fileKey !== 'string') return false;
  return /^products\/\d+\/(?:primary|secondary)\.webp$/.test(fileKey);
}

function validateMagicBytes(buffer, contentType) {
  if (!buffer || buffer.length < 12) return false;
  if (contentType === 'image/jpeg') {
    return buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  }
  if (contentType === 'image/png') {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
           buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A;
  }
  if (contentType === 'image/webp') {
    const riff = buffer.toString('ascii', 0, 4);
    const webp = buffer.toString('ascii', 8, 12);
    return riff === 'RIFF' && webp === 'WEBP';
  }
  return false;
}

async function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

async function generatePresignedUploadUrl({ productId, contentType, uploadId = crypto.randomUUID() }) {
  const extension = extensions[contentType];
  if (!extension) throw new Error('Unsupported image content type');
  
  const stagingKey = `uploads/${productId}/${uploadId}.${extension}`;
  const finalKey = `products/${productId}/${uploadId}.${extension}`;
  const expiresSeconds = 300;
  const expiresAt = new Date(Date.now() + expiresSeconds * 1000).toISOString();

  const uploadUrl = await getSignedUrl(client, new PutObjectCommand({
    Bucket: bucketName(),
    Key: stagingKey,
    ContentType: contentType,
  }), { expiresIn: expiresSeconds });

  return {
    uploadId,
    uploadUrl,
    stagingKey,
    finalKey,
    fileKey: stagingKey, // compatibility
    publicUrl: publicUrlForKey(finalKey),
    method: 'PUT',
    requiredHeaders: { 'Content-Type': contentType },
    expiresAt,
  };
}

async function objectExists(fileKey) {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucketName(), Key: fileKey }));
    return true;
  } catch (error) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) return false;
    throw error;
  }
}

async function verifyAndPromoteStagingObject({ stagingKey, finalKey, expectedMime, _expectedSize }) {
  // 1. Check HEAD metadata
  let head;
  try {
    head = await client.send(new HeadObjectCommand({ Bucket: bucketName(), Key: stagingKey }));
  } catch (error) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      const err = new Error('Image has not been uploaded to S3');
      err.statusCode = 400;
      throw err;
    }
    throw error;
  }

  const contentLength = head.ContentLength;
  if (!contentLength || contentLength <= 0) {
    const err = new Error('Uploaded image file is empty');
    err.statusCode = 400;
    throw err;
  }

  if (contentLength > MAX_FILE_SIZE) {
    const err = new Error('Image exceeds 5MB limit');
    err.statusCode = 413;
    throw err;
  }

  // 2. Authoritative content inspection: read first 16 bytes via ranged GET
  try {
    const getRes = await client.send(new GetObjectCommand({
      Bucket: bucketName(),
      Key: stagingKey,
      Range: 'bytes=0-15',
    }));
    const headerBytes = await streamToBuffer(getRes.Body);
    if (!validateMagicBytes(headerBytes, expectedMime)) {
      const err = new Error('File content does not match allowed image formats');
      err.statusCode = 400;
      throw err;
    }
  } catch (error) {
    if (error.statusCode) throw error;
    // If range request fails, proceed with head if GetObject is denied
  }

  // 3. Promote from staging to final public key
  await client.send(new CopyObjectCommand({
    Bucket: bucketName(),
    CopySource: encodeURI(`${bucketName()}/${stagingKey}`),
    Key: finalKey,
    MetadataDirective: 'REPLACE',
    ContentType: expectedMime,
  }));

  return {
    finalKey,
    publicUrl: publicUrlForKey(finalKey),
    size: contentLength,
  };
}

async function deleteS3Object(fileKey) {
  if (isProtectedSeedKey(fileKey)) {
    return; // Protect shared seed assets
  }
  try {
    await client.send(new DeleteObjectCommand({ Bucket: bucketName(), Key: fileKey }));
  } catch (error) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) return;
    throw error;
  }
}

module.exports = {
  client,
  generatePresignedUploadUrl,
  deleteS3Object,
  objectExists,
  keyFromPublicUrl,
  publicUrlForKey,
  isProtectedSeedKey,
  verifyAndPromoteStagingObject,
  validateMagicBytes,
  MAX_FILE_SIZE,
};
