const db = require('../config/db');

/**
 * Fetch image binary data and created_at for ETag generation.
 * This is the ONLY query in the codebase that selects image_data.
 *
 * @param {number} imageId
 * @returns {Promise<Object|null>} { image_id, image_data (Buffer), created_at }
 */
async function findImageDataById(imageId) {
  const query = `
    SELECT
      image_id,
      image_data,
      created_at
    FROM product_images
    WHERE image_id = $1
  `;
  const result = await db.query(query, [imageId]);
  return result.rows[0] || null;
}

module.exports = {
  findImageDataById,
};
