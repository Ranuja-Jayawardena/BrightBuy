const db = require('../config/db');
const categoryModel = require('../models/adminCategoryModel');

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function positiveId(value, fieldName) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw httpError(400, `${fieldName} must be a positive integer`);
  return id;
}

function name(value, required = false) {
  if (value === undefined || value === null) {
    if (required) throw httpError(400, 'category_name is required');
    return undefined;
  }
  const normalized = String(value).trim();
  if (!normalized && required) throw httpError(400, 'category_name is required');
  if (normalized.length > 100) throw httpError(400, 'category_name must be 100 characters or fewer');
  return normalized;
}

function parentId(value) {
  if (value === undefined || value === null || value === '') return null;
  return positiveId(value, 'parent_category_id');
}

function buildTree(rows) {
  const nodes = new Map(rows.map((row) => [row.category_id, { ...row, children: [] }]));
  const roots = [];
  for (const node of nodes.values()) {
    if (node.parent_category_id === null || !nodes.has(node.parent_category_id)) roots.push(node);
    else nodes.get(node.parent_category_id).children.push(node);
  }
  return roots;
}

async function listCategories() {
  return { categories: buildTree(await categoryModel.findAllCategories()) };
}

async function ensureParentExists(parentCategoryId, categoryId) {
  if (parentCategoryId === null) return;
  if (categoryId && parentCategoryId === categoryId) throw httpError(400, 'Circular category hierarchy');
  if (categoryId) {
    const result = await db.query(`
      WITH RECURSIVE ancestors AS (
        SELECT category_id, parent_category_id FROM categories WHERE category_id = $1
        UNION ALL
        SELECT c.category_id, c.parent_category_id
        FROM categories c JOIN ancestors a ON c.category_id = a.parent_category_id
      )
      SELECT category_id FROM ancestors WHERE category_id = $2
    `, [parentCategoryId, categoryId]);
    if (result.rows.length) throw httpError(400, 'Circular category hierarchy');
  }
  const parent = await categoryModel.findCategoryById(parentCategoryId);
  if (!parent) throw httpError(400, 'Parent category not found');
}

async function createCategory(body) {
  const categoryName = name(body.category_name, true);
  const parentCategoryId = parentId(body.parent_category_id);
  await ensureParentExists(parentCategoryId);
  try {
    return { category: await categoryModel.createCategory({ categoryName, parentCategoryId }) };
  } catch (error) {
    if (error.code === '23505') throw httpError(409, 'Category name already exists');
    throw error;
  }
}

async function updateCategory(categoryId, body) {
  const current = await categoryModel.findCategoryById(categoryId);
  if (!current) return null;
  const fields = {};
  if (body.category_name !== undefined) fields.category_name = name(body.category_name, true);
  if (body.parent_category_id !== undefined) fields.parent_category_id = parentId(body.parent_category_id);
  if (body.is_active !== undefined) {
    if (typeof body.is_active !== 'boolean') throw httpError(400, 'is_active must be a boolean');
    fields.is_active = body.is_active;
  }
  if (fields.parent_category_id !== undefined) await ensureParentExists(fields.parent_category_id, categoryId);
  if (!Object.keys(fields).length) return { category: current };
  return { category: await categoryModel.updateCategory(categoryId, fields) };
}

async function deleteCategory(categoryId) {
  const result = await db.query(`
    UPDATE categories SET is_active = false
    WHERE category_id = $1
    RETURNING category_id, category_name, parent_category_id, is_active
  `, [categoryId]);
  return result.rows[0] ? { category: result.rows[0] } : null;
}

module.exports = { listCategories, createCategory, updateCategory, deleteCategory, positiveId };
