const db = require('../config/db');

function mapUniqueViolation(error, message) {
  if (error && error.code === '23505') {
    const conflict = new Error(message);
    conflict.status = 409;
    throw conflict;
  }
  throw error;
}

async function findProducts({ page, limit, search }) {
  const values = [];
  const whereConditions = [];
  let paramIndex = 1;

  if (search) {
    values.push(`%${search}%`);
    whereConditions.push(`(
      p.product_name ILIKE $${paramIndex}
      OR p.brand ILIKE $${paramIndex}
      OR p.base_sku ILIKE $${paramIndex}
      OR p.description ILIKE $${paramIndex}
    )`);
    paramIndex++;
  }

  const whereClause = whereConditions.length ? `WHERE ${whereConditions.join(' AND ')}` : '';
  const countQuery = `
    SELECT COUNT(*)::int AS total_count
    FROM products p
    ${whereClause}
  `;

  const offset = (page - 1) * limit;
  values.push(limit);
  const limitParam = `$${paramIndex++}`;
  values.push(offset);
  const offsetParam = `$${paramIndex++}`;

  const dataQuery = `
    SELECT
      p.product_id,
      p.product_name,
      p.brand,
      p.base_sku,
      p.is_active,
      p.created_at,
      p.updated_at,
      (
        SELECT pi.image_id
        FROM product_images pi
        WHERE pi.product_id = p.product_id
        ORDER BY pi.is_primary DESC, pi.sort_order ASC, pi.image_id ASC
        LIMIT 1
      ) AS primary_image_id,
      COALESCE(v.variant_count, 0) AS variant_count,
      COALESCE(v.total_stock, 0) AS total_stock,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'category_id', c.category_id,
              'category_name', c.category_name,
              'is_active', c.is_active
            ) ORDER BY c.category_name ASC
          )
          FROM product_categories pc
          JOIN categories c ON c.category_id = pc.category_id
          WHERE pc.product_id = p.product_id
        ),
        '[]'::json
      ) AS categories
    FROM products p
    LEFT JOIN LATERAL (
      SELECT
        COUNT(pv.variant_id)::int AS variant_count,
        SUM(pv.stock_quantity)::int AS total_stock
      FROM product_variants pv
      WHERE pv.product_id = p.product_id
    ) v ON true
    ${whereClause}
    ORDER BY p.updated_at DESC, p.product_id DESC
    LIMIT ${limitParam} OFFSET ${offsetParam}
  `;

  const countValues = values.slice(0, values.length - 2);
  const [countResult, dataResult] = await Promise.all([
    db.query(countQuery, countValues),
    db.query(dataQuery, values),
  ]);

  return {
    rows: dataResult.rows,
    totalCount: countResult.rows[0]?.total_count || 0,
  };
}

async function findProductDetail(productId) {
  const query = `
    SELECT
      p.product_id,
      p.product_name,
      p.brand,
      p.description,
      p.base_sku,
      p.is_active,
      p.created_at,
      p.updated_at
    FROM products p
    WHERE p.product_id = $1
  `;
  const result = await db.query(query, [productId]);
  return result.rows[0] || null;
}

async function findProductImages(productId) {
  const result = await db.query(`
    SELECT image_id, sort_order, is_primary, created_at
    FROM product_images
    WHERE product_id = $1
    ORDER BY is_primary DESC, sort_order ASC, image_id ASC
  `, [productId]);
  return result.rows;
}

async function findProductCategories(productId) {
  const result = await db.query(`
    SELECT c.category_id, c.category_name, c.parent_category_id, c.is_active
    FROM product_categories pc
    JOIN categories c ON c.category_id = pc.category_id
    WHERE pc.product_id = $1
    ORDER BY c.category_name ASC
  `, [productId]);
  return result.rows;
}

async function findProductVariants(productId) {
  const result = await db.query(`
    SELECT
      pv.variant_id,
      pv.variant_sku,
      pv.variant_name,
      pv.price,
      pv.stock_quantity,
      pv.is_active,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'attribute_id', va.attribute_id,
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
    WHERE pv.product_id = $1
    ORDER BY pv.is_active DESC, pv.variant_id ASC
  `, [productId]);
  return result.rows;
}

async function productExists(productId) {
  const result = await db.query('SELECT 1 FROM products WHERE product_id = $1', [productId]);
  return result.rowCount > 0;
}

async function createProduct({ product_name, brand, description, base_sku, category_ids }) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const productResult = await client.query(`
      INSERT INTO products (product_name, brand, description, base_sku)
      VALUES ($1, $2, $3, $4)
      RETURNING product_id, product_name, brand, description, base_sku, is_active, created_at, updated_at
    `, [product_name, brand || null, description || null, base_sku]);

    const product = productResult.rows[0];
    await replaceProductCategories(client, product.product_id, category_ids);
    await client.query('COMMIT');
    return product;
  } catch (error) {
    await client.query('ROLLBACK');
    mapUniqueViolation(error, 'SKU already exists');
  } finally {
    client.release();
  }
}

async function updateProduct(productId, { product_name, brand, description, base_sku, category_ids }) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const productResult = await client.query(`
      UPDATE products
      SET
        product_name = $2,
        brand = $3,
        description = $4,
        base_sku = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE product_id = $1
      RETURNING product_id, product_name, brand, description, base_sku, is_active, created_at, updated_at
    `, [productId, product_name, brand || null, description || null, base_sku]);

    if (productResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    await replaceProductCategories(client, productId, category_ids);
    await client.query('COMMIT');
    return productResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    mapUniqueViolation(error, 'SKU already exists');
  } finally {
    client.release();
  }
}

async function softDeleteProduct(productId) {
  const result = await db.query(`
    UPDATE products
    SET is_active = false, updated_at = CURRENT_TIMESTAMP
    WHERE product_id = $1
    RETURNING product_id, product_name, brand, description, base_sku, is_active, created_at, updated_at
  `, [productId]);
  return result.rows[0] || null;
}

async function replaceProductCategories(client, productId, categoryIds) {
  await client.query('DELETE FROM product_categories WHERE product_id = $1', [productId]);
  for (const categoryId of categoryIds) {
    await client.query(`
      INSERT INTO product_categories (product_id, category_id)
      VALUES ($1, $2)
    `, [productId, categoryId]);
  }
}

async function createImage({ product_id, image_data, sort_order, is_primary }) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    if (is_primary) {
      await client.query('UPDATE product_images SET is_primary = false WHERE product_id = $1', [product_id]);
    }
    const result = await client.query(`
      INSERT INTO product_images (product_id, image_data, sort_order, is_primary)
      VALUES ($1, $2, $3, $4)
      RETURNING image_id, product_id, sort_order, is_primary, created_at
    `, [product_id, image_data, sort_order, is_primary]);
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function updateImage(imageId, { sort_order, is_primary }) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT image_id, product_id, sort_order, is_primary FROM product_images WHERE image_id = $1', [imageId]);
    if (existing.rowCount === 0) {
      await client.query('ROLLBACK');
      return null;
    }
    const image = existing.rows[0];
    const nextPrimary = is_primary === undefined ? image.is_primary : is_primary;
    if (nextPrimary) {
      await client.query('UPDATE product_images SET is_primary = false WHERE product_id = $1 AND image_id <> $2', [image.product_id, imageId]);
    }
    const result = await client.query(`
      UPDATE product_images
      SET sort_order = $2, is_primary = $3
      WHERE image_id = $1
      RETURNING image_id, product_id, sort_order, is_primary, created_at
    `, [imageId, sort_order === undefined ? image.sort_order : sort_order, nextPrimary]);
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function deleteImage(imageId) {
  const result = await db.query(`
    DELETE FROM product_images
    WHERE image_id = $1
    RETURNING image_id, product_id, sort_order, is_primary
  `, [imageId]);
  return result.rows[0] || null;
}

async function createVariant(productId, { variant_sku, variant_name, price, stock_quantity, attributes }) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const variantResult = await client.query(`
      INSERT INTO product_variants (product_id, variant_sku, variant_name, price, stock_quantity)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING variant_id, product_id, variant_sku, variant_name, price, stock_quantity, is_active
    `, [productId, variant_sku, variant_name || null, price, stock_quantity]);
    const variant = variantResult.rows[0];
    await replaceVariantAttributes(client, variant.variant_id, attributes);
    await client.query('COMMIT');
    return variant;
  } catch (error) {
    await client.query('ROLLBACK');
    mapUniqueViolation(error, 'Variant SKU already exists');
  } finally {
    client.release();
  }
}

async function updateVariant(variantId, { variant_sku, variant_name, price, stock_quantity, attributes }) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const variantResult = await client.query(`
      UPDATE product_variants
      SET
        variant_sku = COALESCE($2, variant_sku),
        variant_name = COALESCE($3, variant_name),
        price = COALESCE($4, price),
        stock_quantity = COALESCE($5, stock_quantity),
        updated_at = CURRENT_TIMESTAMP
      WHERE variant_id = $1
      RETURNING variant_id, product_id, variant_sku, variant_name, price, stock_quantity, is_active
    `, [variantId, variant_sku, variant_name || null, price, stock_quantity]);
    if (variantResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return null;
    }
    if (attributes !== undefined) {
      await replaceVariantAttributes(client, variantId, attributes);
    }
    await client.query('COMMIT');
    return variantResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    mapUniqueViolation(error, 'Variant SKU already exists');
  } finally {
    client.release();
  }
}

async function softDeleteVariant(variantId) {
  const result = await db.query(`
    UPDATE product_variants
    SET is_active = false, updated_at = CURRENT_TIMESTAMP
    WHERE variant_id = $1
    RETURNING variant_id, product_id, variant_sku, variant_name, price, stock_quantity, is_active
  `, [variantId]);
  return result.rows[0] || null;
}

async function replaceVariantAttributes(client, variantId, attributes) {
  await client.query('DELETE FROM variant_attribute_values WHERE variant_id = $1', [variantId]);
  for (const attribute of attributes) {
    const attributeResult = await client.query(`
      INSERT INTO variant_attributes (attribute_name)
      VALUES ($1)
      ON CONFLICT (attribute_name) DO UPDATE SET attribute_name = EXCLUDED.attribute_name
      RETURNING attribute_id
    `, [attribute.attribute_name]);

    await client.query(`
      INSERT INTO variant_attribute_values (variant_id, attribute_id, attribute_value)
      VALUES ($1, $2, $3)
    `, [variantId, attributeResult.rows[0].attribute_id, attribute.attribute_value]);
  }
}

module.exports = {
  findProducts,
  findProductDetail,
  findProductImages,
  findProductCategories,
  findProductVariants,
  productExists,
  createProduct,
  updateProduct,
  softDeleteProduct,
  createImage,
  updateImage,
  deleteImage,
  createVariant,
  updateVariant,
  softDeleteVariant,
};
