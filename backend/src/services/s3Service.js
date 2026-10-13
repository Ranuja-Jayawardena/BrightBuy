const crypto = require('crypto');
const { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const region = process.env.AWS_REGION || 'us-east-1';
const client = new S3Client({ region });
const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

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

async function generatePresignedUploadUrl({ productId, contentType }) {
  const extension = extensions[contentType];
  if (!extension) throw new Error('Unsupported image content type');
  const fileKey = `products/${productId}/${crypto.randomUUID()}.${extension}`;
  const uploadUrl = await getSignedUrl(client, new PutObjectCommand({
    Bucket: bucketName(), Key: fileKey, ContentType: contentType,
  }), { expiresIn: 300 });
  return { uploadUrl, fileKey, publicUrl: publicUrlForKey(fileKey) };
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

async function deleteS3Object(fileKey) {
  await client.send(new DeleteObjectCommand({ Bucket: bucketName(), Key: fileKey }));
}

module.exports = { generatePresignedUploadUrl, deleteS3Object, objectExists, keyFromPublicUrl };
