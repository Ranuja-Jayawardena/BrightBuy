const crypto = require('crypto');
const imageModel = require('../models/imageModel');

/**
 * Detect MIME type from binary magic bytes.
 * Falls back to 'application/octet-stream' if unknown.
 *
 * @param {Buffer} buffer
 * @returns {string}
 */
function detectMimeType(buffer) {
  if (!buffer || buffer.length < 4) {
    return 'application/octet-stream';
  }

  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return 'image/png';
  }
  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }
  // GIF: 47 49 46 38
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
    return 'image/gif';
  }
  // WebP: 52 49 46 46 ... 57 45 42 50
  if (buffer.length >= 12 &&
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
    return 'image/webp';
  }
  // BMP: 42 4D
  if (buffer[0] === 0x42 && buffer[1] === 0x4D) {
    return 'image/bmp';
  }

  return 'application/octet-stream';
}

/**
 * Generate a strong ETag from image content using MD5 hash.
 *
 * @param {Buffer} imageData
 * @returns {string} Quoted ETag value, e.g. '"abc123..."'
 */
function generateETag(imageData) {
  const hash = crypto.createHash('md5').update(imageData).digest('hex');
  return `"${hash}"`;
}

/**
 * Fetch an image by ID and return its binary data, MIME type, and ETag.
 *
 * @param {number} imageId
 * @returns {Promise<{ imageData: Buffer, mimeType: string, etag: string } | null>}
 */
async function getImageById(imageId) {
  const image = await imageModel.findImageDataById(imageId);
  if (!image) {
    return null;
  }

  const imageData = image.image_data;
  const mimeType = detectMimeType(imageData);
  const etag = generateETag(imageData);

  return { imageData, mimeType, etag };
}

module.exports = {
  getImageById,
  detectMimeType,
  generateETag,
};
