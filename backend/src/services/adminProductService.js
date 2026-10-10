const adminProductModel = require('../models/adminProductModel');
const { detectMimeType } = require('./imageService');

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function parsePositiveInteger(value, fieldName) {
  const parsed = parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createHttpError(400, `${fieldName} must be a positive integer`);
  }
  return parsed;
}

function parseNonNegativeInteger(value, fieldName, defaultValue = 0) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw createHttpError(400, `${fieldName} must be a non-negative integer`);
  }
  return parsed;
}

function parseBoolean(value, fieldName, defaultValue = false) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (value === 'true' || value === '1') {
    return true;
  }
  if (value === 'false' || value === '0') {
    return false;
  }
  throw createHttpError(400, `${fieldName} must be a boolean`);
}

function normalizeString(value, fieldName, { required = false, maxLength } = {}) {
  if (value === undefined || value === null) {
    if (required) {
      throw createHttpError(400, `${fieldName} is required`);
    }
    return null;
  }
  const normalized = String(value).trim();
  if (!normalized) {
    if (required) {
      throw createHttpError(400, `${fieldName} is required`);
    }
    return null;
  }
  if (maxLength && normalized.length > maxLength) {
    throw createHttpError(400, `${fieldName} must be ${maxLength} characters or fewer`);
  }
  return normalized;
}

function normalizeCategoryIds(value) {
  if (!Array.isArray(value)) {
    throw createHttpError(400, 'category_ids must be an array');
  }
  return [...new Set(value.map((id) => parsePositiveInteger(id, 'category_ids')))];
}

function normalizeAttributes(value) {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw createHttpError(400, 'attributes must be an array');
  }
  return value.map((attribute) => ({
    attribute_name: normalizeString(attribute.attribute_name, 'attribute_name', { required: true, maxLength: 50 }),
    attribute_value: normalizeString(attribute.attribute_value, 'attribute_value', { required: true, maxLength: 100 }),
  }));
}

function mapProduct(row) {
  return {
    product_id: row.product_id,
    product_name: row.product_name,
    brand: row.brand,
    description: row.description,
    base_sku: row.base_sku,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapVariant(row, attributes = []) {
  return {
    variant_id: row.variant_id,
    product_id: row.product_id,
    variant_sku: row.variant_sku,
    variant_name: row.variant_name,
    price: parseFloat(row.price),
    stock_quantity: parseInt(row.stock_quantity, 10),
    is_active: row.is_active,
    attributes,
  };
}

async function listProducts(queryParams) {
  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(queryParams.limit, 10) || 20));
  const search = queryParams.search && queryParams.search.trim() ? queryParams.search.trim() : undefined;
  const { rows, totalCount } = await adminProductModel.findProducts({ page, limit, search });

  return {
    products: rows.map((row) => ({
      product_id: row.product_id,
      product_name: row.product_name,
      brand: row.brand,
      base_sku: row.base_sku,
      is_active: row.is_active,
      primary_image_id: row.primary_image_id || null,
      variant_count: parseInt(row.variant_count, 10) || 0,
      total_stock: parseInt(row.total_stock, 10) || 0,
      categories: Array.isArray(row.categories) ? row.categories : [],
      created_at: row.created_at,
      updated_at: row.updated_at,
    })),
    pagination: {
      page,
      limit,
      total_count: totalCount,
      total_pages: Math.ceil(totalCount / limit) || 1,
    },
  };
}

async function getProductDetail(productId) {
  const product = await adminProductModel.findProductDetail(productId);
  if (!product) {
    return null;
  }

  const [images, variants, categories] = await Promise.all([
    adminProductModel.findProductImages(productId),
    adminProductModel.findProductVariants(productId),
    adminProductModel.findProductCategories(productId),
  ]);

  return {
    product: {
      ...mapProduct(product),
      images: images.map((image) => ({
        image_id: image.image_id,
        sort_order: image.sort_order,
        is_primary: image.is_primary,
        created_at: image.created_at,
      })),
      variants: variants.map((variant) => mapVariant(variant, Array.isArray(variant.attributes) ? variant.attributes : [])),
      categories,
    },
  };
}

async function createProduct(body) {
  const payload = {
    product_name: normalizeString(body.product_name, 'product_name', { required: true, maxLength: 100 }),
    brand: normalizeString(body.brand, 'brand', { maxLength: 100 }),
    description: normalizeString(body.description, 'description'),
    base_sku: normalizeString(body.base_sku, 'base_sku', { required: true, maxLength: 50 }),
    category_ids: normalizeCategoryIds(body.category_ids),
  };
  return { product: mapProduct(await adminProductModel.createProduct(payload)) };
}

async function updateProduct(productId, body) {
  const payload = {
    product_name: normalizeString(body.product_name, 'product_name', { required: true, maxLength: 100 }),
    brand: normalizeString(body.brand, 'brand', { maxLength: 100 }),
    description: normalizeString(body.description, 'description'),
    base_sku: normalizeString(body.base_sku, 'base_sku', { required: true, maxLength: 50 }),
    category_ids: normalizeCategoryIds(body.category_ids),
  };
  const product = await adminProductModel.updateProduct(productId, payload);
  return product ? { product: mapProduct(product) } : null;
}

async function softDeleteProduct(productId) {
  const product = await adminProductModel.softDeleteProduct(productId);
  return product ? { product: mapProduct(product) } : null;
}

async function createImage(productId, file, body) {
  if (!await adminProductModel.productExists(productId)) {
    return null;
  }
  if (!file || !file.buffer || file.buffer.length === 0) {
    throw createHttpError(400, 'image file is required');
  }
  if (file.buffer.length > MAX_IMAGE_SIZE_BYTES) {
    throw createHttpError(400, 'image file must be 5MB or smaller');
  }
  const mimeType = detectMimeType(file.buffer);
  if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
    throw createHttpError(400, 'image file must be PNG, JPEG, GIF, or WebP');
  }

  const image = await adminProductModel.createImage({
    product_id: productId,
    image_data: file.buffer,
    sort_order: parseNonNegativeInteger(body.sort_order, 'sort_order', 0),
    is_primary: parseBoolean(body.is_primary, 'is_primary', false),
  });

  return {
    image: {
      image_id: image.image_id,
      product_id: image.product_id,
      sort_order: image.sort_order,
      is_primary: image.is_primary,
      created_at: image.created_at,
    },
  };
}

async function updateImage(imageId, body) {
  const image = await adminProductModel.updateImage(imageId, {
    sort_order: body.sort_order === undefined ? undefined : parseNonNegativeInteger(body.sort_order, 'sort_order'),
    is_primary: body.is_primary === undefined ? undefined : parseBoolean(body.is_primary, 'is_primary'),
  });
  return image ? { image } : null;
}

async function deleteImage(imageId) {
  const image = await adminProductModel.deleteImage(imageId);
  return image ? { image } : null;
}

async function createVariant(productId, body) {
  if (!await adminProductModel.productExists(productId)) {
    return null;
  }
  const payload = normalizeVariantPayload(body);
  const variant = await adminProductModel.createVariant(productId, payload);
  return { variant: mapVariant(variant, payload.attributes) };
}

async function updateVariant(variantId, body) {
  const payload = normalizeVariantPayload(body, false);
  const variant = await adminProductModel.updateVariant(variantId, payload);
  return variant ? { variant: mapVariant(variant, payload.attributes) } : null;
}

async function softDeleteVariant(variantId) {
  const variant = await adminProductModel.softDeleteVariant(variantId);
  return variant ? { variant: mapVariant(variant) } : null;
}

function normalizeVariantPayload(body, requireSku = true) {
  const hasPrice = body.price !== undefined && body.price !== null && body.price !== '';
  const price = hasPrice ? Number(body.price) : undefined;
  if (hasPrice && (!Number.isFinite(price) || price < 0)) {
    throw createHttpError(400, 'price must be a non-negative number');
  }
  return {
    variant_sku: normalizeString(body.variant_sku, 'variant_sku', { required: requireSku, maxLength: 50 }),
    variant_name: normalizeString(body.variant_name, 'variant_name', { maxLength: 100 }),
    price,
    stock_quantity: body.stock_quantity === undefined ? undefined : parseNonNegativeInteger(body.stock_quantity, 'stock_quantity', 0),
    attributes: body.attributes === undefined ? (requireSku ? [] : undefined) : normalizeAttributes(body.attributes),
  };
}

module.exports = {
  listProducts,
  getProductDetail,
  createProduct,
  updateProduct,
  softDeleteProduct,
  createImage,
  updateImage,
  deleteImage,
  createVariant,
  updateVariant,
  softDeleteVariant,
  parsePositiveInteger,
};
