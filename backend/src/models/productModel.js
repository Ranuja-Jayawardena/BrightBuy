const db = require('../config/db');

/**
 * Query products with pagination, keyword search, category filter (including child categories),
 * brand filter, and sorting. Excludes inactive products, variants, and categories.
 *
 * @param {Object} options
 * @param {number} options.page
 * @param {number} options.limit
 * @param {string} [options.search]
 * @param {number} [options.categoryId]
 * @param {string} [options.brand]
 * @param {string} [options.sort]
 * @returns {Promise<{ rows: Array<Object>, totalCount: number }>}
 */
async function findProducts({ page = 1, limit = 12, search, categoryId, brand, sort }) {
  const values = [];
  const countValues = [];
  let paramIndex = 1;
  let countParamIndex = 1;

  let cteClause = '';
  let countCteClause = '';
  let categoryFilterClause = '';
  let countCategoryFilterClause = '';

  if (categoryId) {
    cteClause = `
      WITH RECURSIVE category_tree AS (
        SELECT category_id FROM categories WHERE category_id = $${paramIndex} AND is_active = true
        UNION ALL
        SELECT c.category_id FROM categories c
        JOIN category_tree ct ON c.parent_category_id = ct.category_id
        WHERE c.is_active = true
      )
    `;
    values.push(categoryId);
    categoryFilterClause = `
      AND EXISTS (
        SELECT 1 FROM product_categories pc
        JOIN category_tree ct ON pc.category_id = ct.category_id
        WHERE pc.product_id = p.product_id
      )
    `;
    paramIndex++;

    countCteClause = `
      WITH RECURSIVE category_tree AS (
        SELECT category_id FROM categories WHERE category_id = $${countParamIndex} AND is_active = true
        UNION ALL
        SELECT c.category_id FROM categories c
        JOIN category_tree ct ON c.parent_category_id = ct.category_id
        WHERE c.is_active = true
      )
    `;
    countValues.push(categoryId);
    countCategoryFilterClause = `
      AND EXISTS (
        SELECT 1 FROM product_categories pc
        JOIN category_tree ct ON pc.category_id = ct.category_id
        WHERE pc.product_id = p.product_id
      )
    `;
    countParamIndex++;
  }

  const whereConditions = ['p.is_active = true'];
  const countWhereConditions = ['p.is_active = true'];

  if (brand) {
    whereConditions.push(`LOWER(p.brand) = LOWER($${paramIndex})`);
    values.push(brand);
    paramIndex++;

    countWhereConditions.push(`LOWER(p.brand) = LOWER($${countParamIndex})`);
    countValues.push(brand);
    countParamIndex++;
  }

  if (search) {
    const searchPattern = `%${search}%`;
    whereConditions.push(`(p.product_name ILIKE $${paramIndex} OR p.brand ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`);
    values.push(searchPattern);
    paramIndex++;

    countWhereConditions.push(`(p.product_name ILIKE $${countParamIndex} OR p.brand ILIKE $${countParamIndex} OR p.description ILIKE $${countParamIndex})`);
    countValues.push(searchPattern);
    countParamIndex++;
  }

  const whereClause = `WHERE ${whereConditions.join(' AND ')} ${categoryFilterClause}`;
  const countWhereClause = `WHERE ${countWhereConditions.join(' AND ')} ${countCategoryFilterClause}`;

  let orderByClause = 'ORDER BY p.created_at DESC, p.product_id DESC';
  if (sort === 'price_asc') {
    orderByClause = 'ORDER BY v.min_price ASC NULLS LAST, p.product_id ASC';
  } else if (sort === 'price_desc') {
    orderByClause = 'ORDER BY v.max_price DESC NULLS LAST, p.product_id ASC';
  } else if (sort === 'name_asc') {
    orderByClause = 'ORDER BY p.product_name ASC, p.product_id ASC';
  } else if (sort === 'name_desc') {
    orderByClause = 'ORDER BY p.product_name DESC, p.product_id ASC';
  }

  const countQuery = `
    ${countCteClause}
    SELECT COUNT(*)::int AS total_count
    FROM products p
    ${countWhereClause}
  `;

  const offset = (page - 1) * limit;
  values.push(limit);
  const limitParam = `$${paramIndex++}`;
  values.push(offset);
  const offsetParam = `$${paramIndex++}`;

  const dataQuery = `
    ${cteClause}
    SELECT
      p.product_id,
      p.product_name,
      p.brand,
      p.base_sku,
      (
        SELECT pi.image_id
        FROM product_images pi
        WHERE pi.product_id = p.product_id
        ORDER BY pi.is_primary DESC, pi.sort_order ASC, pi.image_id ASC
        LIMIT 1
      ) AS primary_image_id,
      v.min_price,
      v.max_price,
      COALESCE(v.variant_count, 0) AS variant_count,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'category_id', c.category_id,
              'category_name', c.category_name
            ) ORDER BY c.category_name ASC
          )
          FROM product_categories pc
          JOIN categories c ON c.category_id = pc.category_id
          WHERE pc.product_id = p.product_id AND c.is_active = true
        ),
        '[]'::json
      ) AS categories
    FROM products p
    LEFT JOIN LATERAL (
      SELECT
        MIN(pv.price) AS min_price,
        MAX(pv.price) AS max_price,
        COUNT(pv.variant_id)::int AS variant_count
      FROM product_variants pv
      WHERE pv.product_id = p.product_id AND pv.is_active = true
    ) v ON true
    ${whereClause}
    ${orderByClause}
    LIMIT ${limitParam} OFFSET ${offsetParam}
  `;

  const [countResult, dataResult] = await Promise.all([
    db.query(countQuery, countValues),
    db.query(dataQuery, values),
  ]);

  const totalCount = countResult.rows[0]?.total_count || 0;

  return {
    rows: dataResult.rows,
    totalCount,
  };
}

/**
 * Find active product by product_id
 * @param {number} id
 * @returns {Promise<Object|null>}
 */
async function findProductById(id) {
  const query = `
    SELECT
      p.product_id,
      p.product_name,
      p.brand,
      p.description,
      p.base_sku,
      p.is_active
    FROM products p
    WHERE p.product_id = $1 AND p.is_active = true
  `;
  const result = await db.query(query, [id]);
  return result.rows[0] || null;
}

/**
 * Find image metadata for a product (strictly metadata, NO BYTEA image_data).
 * @param {number} productId
 * @returns {Promise<Array<Object>>}
 */
async function findProductImages(productId) {
  const query = `
    SELECT
      image_id,
      sort_order,
      is_primary
    FROM product_images
    WHERE product_id = $1
    ORDER BY is_primary DESC, sort_order ASC, image_id ASC
  `;
  const result = await db.query(query, [productId]);
  return result.rows;
}

/**
 * Find active variants and their attributes for a product.
 * @param {number} productId
 * @returns {Promise<Array<Object>>}
 */
async function findProductVariants(productId) {
  const query = `
    SELECT
      pv.variant_id,
      pv.variant_sku,
      pv.variant_name,
      pv.price,
      pv.stock_quantity,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'attribute_name', va.attribute_name,
              'attribute_value', vav.attribute_value
            ) ORDER BY va.attribute_name ASC
          )
          FROM variant_attribute_values vav
          JOIN variant_attributes va ON va.attribute_id = vav.attribute_id
          WHERE vav.variant_id = pv.variant_id
        ),
        '[]'::json
      ) AS attributes
    FROM product_variants pv
    WHERE pv.product_id = $1 AND pv.is_active = true
    ORDER BY pv.price ASC, pv.variant_id ASC
  `;
  const result = await db.query(query, [productId]);
  return result.rows;
}

/**
 * Find active categories linked to a product.
 * @param {number} productId
 * @returns {Promise<Array<Object>>}
 */
async function findProductCategories(productId) {
  const query = `
    SELECT
      c.category_id,
      c.category_name
    FROM product_categories pc
    JOIN categories c ON c.category_id = pc.category_id
    WHERE pc.product_id = $1 AND c.is_active = true
    ORDER BY c.category_name ASC
  `;
  const result = await db.query(query, [productId]);
  return result.rows;
}

module.exports = {
  findProducts,
  findProductById,
  findProductImages,
  findProductVariants,
  findProductCategories,
};
