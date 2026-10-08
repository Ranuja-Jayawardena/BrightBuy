const db = require('../config/db');

/**
 * Fetch all active categories ordered by category name.
 * @returns {Promise<Array<Object>>}
 */
async function findAllActiveCategories() {
  const query = `
    SELECT
      category_id,
      category_name,
      parent_category_id
    FROM categories
    WHERE is_active = true
    ORDER BY category_name ASC
  `;
  const result = await db.query(query);
  return result.rows;
}

module.exports = {
  findAllActiveCategories,
};
