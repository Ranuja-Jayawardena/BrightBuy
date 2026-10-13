const db = require('../config/db');

async function findImageUrlById(imageId) {
  const query = `
    SELECT
      image_id,
      image_url
    FROM product_images
    WHERE image_id = $1
  `;
  const result = await db.query(query, [imageId]);
  return result.rows[0] || null;
}

module.exports = {
  findImageUrlById,
};
