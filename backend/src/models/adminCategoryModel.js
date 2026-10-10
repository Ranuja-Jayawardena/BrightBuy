const db = require('../config/db');

async function findAllCategories() {
  const result = await db.query(`
    SELECT category_id, category_name, parent_category_id, is_active
    FROM categories
    ORDER BY category_name ASC, category_id ASC
  `);
  return result.rows;
}

async function findCategoryById(categoryId, client = db) {
  const result = await client.query(`
    SELECT category_id, category_name, parent_category_id, is_active
    FROM categories
    WHERE category_id = $1
  `, [categoryId]);
  return result.rows[0] || null;
}

async function createCategory({ categoryName, parentCategoryId }) {
  const result = await db.query(`
    INSERT INTO categories (category_name, parent_category_id)
    VALUES ($1, $2)
    RETURNING category_id, category_name, parent_category_id, is_active
  `, [categoryName, parentCategoryId]);
  return result.rows[0];
}

async function updateCategory(categoryId, fields) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const assignments = [];
    const values = [];
    for (const [column, value] of Object.entries(fields)) {
      values.push(value);
      assignments.push(`${column} = $${values.length}`);
    }
    values.push(categoryId);
    const result = await client.query(`
      UPDATE categories
      SET ${assignments.join(', ')}
      WHERE category_id = $${values.length}
      RETURNING category_id, category_name, parent_category_id, is_active
    `, values);
    await client.query('COMMIT');
    return result.rows[0] || null;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { findAllCategories, findCategoryById, createCategory, updateCategory };
