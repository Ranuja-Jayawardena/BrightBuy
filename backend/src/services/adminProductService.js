const adminProductModel = require('../models/adminProductModel');
const s3Service = require('./s3Service');
const mediaCleanupService = require('./mediaCleanupService');

const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function requireBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw createHttpError(400, 'JSON object body is required');
  return body;
}

function parsePositiveInteger(value, fieldName) {
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^\d+$/.test(value))) {
    throw createHttpError(400, `${fieldName} must be a positive integer`);
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createHttpError(400, `${fieldName} must be a positive integer`);
  }
  return parsed;
}

function parseNonNegativeInteger(value, fieldName, defaultValue = 0) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^\d+$/.test(value))) {
    throw createHttpError(400, `${fieldName} must be a non-negative integer`);
  }
  const parsed = Number(value);
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
  if (typeof value !== 'string') {
    throw createHttpError(400, `${fieldName} must be a string`);
  }
  const normalized = value.trim();
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
  return value.map((attribute) => {
    if (!attribute || typeof attribute !== 'object' || Array.isArray(attribute)) {
      throw createHttpError(400, 'each attribute must be an object');
    }
    return ({
    attribute_name: normalizeString(attribute.attribute_name, 'attribute_name', { required: true, maxLength: 50 }),
    attribute_value: normalizeString(attribute.attribute_value, 'attribute_value', { required: true, maxLength: 100 }),
    });
  });
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
  const page = parsePositiveInteger(queryParams.page === undefined ? 1 : queryParams.page, 'page');
  const limit = parsePositiveInteger(queryParams.limit === undefined ? 20 : queryParams.limit, 'limit');
  if (limit > 100) throw createHttpError(400, 'limit must be 100 or fewer');
  const search = queryParams.search === undefined ? undefined : normalizeString(queryParams.search, 'search', { maxLength: 100 }) || undefined;
  const { rows, totalCount } = await adminProductModel.findProducts({ page, limit, search });

  return {
    products: rows.map((row) => ({
      product_id: row.product_id,
      product_name: row.product_name,
      brand: row.brand,
      base_sku: row.base_sku,
      is_active: row.is_active,
      primary_image_id: row.primary_image_id || null,
      primary_image_url: row.primary_image_url || null,
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
        image_url: image.image_url,
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
  requireBody(body);
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
  requireBody(body);
  if (body.is_active !== undefined && body.product_name === undefined && body.base_sku === undefined) {
    const isActive = parseBoolean(body.is_active, 'is_active');
    const product = await adminProductModel.setProductActiveStatus(productId, isActive);
    return product ? { product: mapProduct(product) } : null;
  }

  const payload = {
    product_name: normalizeString(body.product_name, 'product_name', { required: true, maxLength: 100 }),
    brand: normalizeString(body.brand, 'brand', { maxLength: 100 }),
    description: normalizeString(body.description, 'description'),
    base_sku: normalizeString(body.base_sku, 'base_sku', { required: true, maxLength: 50 }),
    category_ids: body.category_ids !== undefined ? normalizeCategoryIds(body.category_ids) : undefined,
    is_active: body.is_active !== undefined ? parseBoolean(body.is_active, 'is_active') : undefined,
  };
  const product = await adminProductModel.updateProduct(productId, payload);
  return product ? { product: mapProduct(product) } : null;
}

async function setProductStatus(productId, body) {
  requireBody(body);
  const isActive = parseBoolean(body.is_active, 'is_active');
  const product = await adminProductModel.setProductActiveStatus(productId, isActive);
  return product ? { product: mapProduct(product) } : null;
}

async function softDeleteProduct(productId) {
  const product = await adminProductModel.softDeleteProduct(productId);
  return product ? { product: mapProduct(product) } : null;
}

async function presignImage(productId, body, userId) {
  requireBody(body);
  if (!await adminProductModel.productExists(productId)) {
    return null;
  }
  if (!ALLOWED_IMAGE_TYPES.has(body.contentType)) throw createHttpError(400, 'contentType must be image/jpeg, image/png, or image/webp');
  normalizeString(body.fileName, 'fileName', { required: true, maxLength: 255 });

  let fileSize = s3Service.MAX_FILE_SIZE;
  if (body.fileSize !== undefined) {
    fileSize = parsePositiveInteger(body.fileSize, 'fileSize');
    if (fileSize > s3Service.MAX_FILE_SIZE) {
      throw createHttpError(413, 'Image exceeds 5MB limit');
    }
  }

  const presignResult = await s3Service.generatePresignedUploadUrl({
    productId,
    contentType: body.contentType,
    fileName: body.fileName,
  });

  try {
    await adminProductModel.createMediaUpload({
      upload_id: presignResult.uploadId,
      product_id: productId,
      issuer_id: userId || 1,
      staging_key: presignResult.stagingKey,
      final_key: presignResult.finalKey,
      expected_mime: body.contentType,
      expected_size: fileSize,
      expires_at: presignResult.expiresAt,
    });
  } catch {
    // If media_uploads table is not yet present on target, gracefully proceed with presign capability
  }

  return presignResult;
}

async function createImage(productId, body) {
  requireBody(body);
  if (!await adminProductModel.productExists(productId)) return null;

  // 1. Target Protocol: client submits uploadId
  if (body.uploadId) {
    let uploadRecord;
    try {
      uploadRecord = await adminProductModel.getMediaUpload(body.uploadId, productId);
    } catch {
      uploadRecord = null;
    }

    if (uploadRecord) {
      // Replay Contract: if already completed, return existing image row idempotently
      if (uploadRecord.status === 'completed' && uploadRecord.image_id) {
        const existingImage = await adminProductModel.getImageById(uploadRecord.image_id);
        if (existingImage) {
          return { image: existingImage, isReplay: true };
        }
      }

      if (uploadRecord.status === 'verifying') {
        throw createHttpError(409, 'This upload is currently being verified.');
      }

      if (uploadRecord.status === 'failed') {
        throw createHttpError(400, 'This upload failed verification and cannot be confirmed.');
      }

      if (new Date(uploadRecord.expires_at).getTime() < Date.now()) {
        throw createHttpError(400, 'Upload authorization has expired.');
      }

      // Claim verification lease
      const claimed = await adminProductModel.claimMediaUploadLease(body.uploadId, productId);
      if (!claimed) {
        throw createHttpError(409, 'Upload is currently being verified or was completed by another request.');
      }

      // Verify and promote S3 object from staging to final
      let promoted;
      try {
        promoted = await s3Service.verifyAndPromoteStagingObject({
          stagingKey: uploadRecord.staging_key,
          finalKey: uploadRecord.final_key,
          expectedMime: uploadRecord.expected_mime,
          expectedSize: uploadRecord.expected_size,
        });
      } catch (err) {
        await adminProductModel.failMediaUpload(body.uploadId);
        throw err;
      }

      // Finalize metadata in DB
      const image = await adminProductModel.finalizeMediaUpload({
        upload_id: body.uploadId,
        product_id: productId,
        final_url: promoted.publicUrl,
        staging_key: uploadRecord.staging_key,
        sort_order: parseNonNegativeInteger(body.sort_order, 'sort_order', 0),
        is_primary: parseBoolean(body.is_primary, 'is_primary', false),
      });

      // Trigger asynchronous background cleanup of staging object
      mediaCleanupService.processPendingJobs().catch(() => {});

      return { image };
    }
  }

  // 2. Compatibility Protocol: client submits image_url
  if (!body.image_url) {
    throw createHttpError(400, 'uploadId or image_url is required');
  }

  const fileKey = s3Service.keyFromPublicUrl(body.image_url, productId);
  if (!fileKey) throw createHttpError(400, 'image_url must be a valid S3 URL for this product');
  if (!await s3Service.objectExists(fileKey)) throw createHttpError(400, 'Image has not been uploaded to S3');

  const image = await adminProductModel.createImage({
    product_id: productId,
    image_url: body.image_url,
    sort_order: parseNonNegativeInteger(body.sort_order, 'sort_order', 0),
    is_primary: parseBoolean(body.is_primary, 'is_primary', false),
  });

  return { image };
}

async function updateImage(imageId, body) {
  requireBody(body);
  const image = await adminProductModel.updateImage(imageId, {
    sort_order: body.sort_order === undefined ? undefined : parseNonNegativeInteger(body.sort_order, 'sort_order'),
    is_primary: body.is_primary === undefined ? undefined : parseBoolean(body.is_primary, 'is_primary'),
  });
  return image ? { image } : null;
}

async function deleteImage(imageId) {
  const image = await adminProductModel.deleteImage(imageId);
  if (image) {
    // Trigger background cleanup worker
    mediaCleanupService.processPendingJobs().catch(() => {});
  }
  return image ? { image } : null;
}

async function createVariant(productId, body) {
  requireBody(body);
  if (!await adminProductModel.productExists(productId)) {
    return null;
  }
  const payload = normalizeVariantPayload(body);
  const variant = await adminProductModel.createVariant(productId, payload);
  return { variant: mapVariant(variant, payload.attributes) };
}

async function updateVariant(variantId, body) {
  requireBody(body);
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
  setProductStatus,
  softDeleteProduct,
  createImage,
  presignImage,
  updateImage,
  deleteImage,
  createVariant,
  updateVariant,
  softDeleteVariant,
  parsePositiveInteger,
};
