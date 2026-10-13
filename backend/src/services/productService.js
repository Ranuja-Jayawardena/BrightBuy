const productModel = require('../models/productModel');

/**
 * Service to fetch paginated product list with search, filtering, and sorting.
 *
 * @param {Object} queryParams
 * @returns {Promise<Object>}
 */
async function getProductsList(queryParams) {
  const page = positiveQueryInteger(queryParams.page, 'page', 1, 1000000);
  const limit = positiveQueryInteger(queryParams.limit, 'limit', 12, 100);
  const search = optionalQueryString(queryParams.search, 'search', 100);
  const brand = optionalQueryString(queryParams.brand, 'brand', 100);
  const minPrice = optionalPrice(queryParams.min_price, 'min_price');
  const maxPrice = optionalPrice(queryParams.max_price, 'max_price');
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    const error = new Error('min_price must be less than or equal to max_price'); error.status = 400; throw error;
  }
  const categoryId = queryParams.category_id === undefined ? undefined : positiveQueryInteger(queryParams.category_id, 'category_id', undefined, 1000000000);
  const sort = queryParams.sort === undefined ? undefined : queryParams.sort;
  if (sort !== undefined && !['name_asc', 'name_desc', 'price_asc', 'price_desc'].includes(sort)) {
    const error = new Error('sort must be one of: name_asc, name_desc, price_asc, price_desc'); error.status = 400; throw error;
  }

  const { rows, totalCount } = await productModel.findProducts({
    page,
    limit,
    search,
    categoryId,
    brand,
    minPrice,
    maxPrice,
    sort,
  });

  const products = rows.map((row) => ({
    product_id: row.product_id,
    product_name: row.product_name,
    brand: row.brand,
    base_sku: row.base_sku,
    primary_image_id: row.primary_image_id || null,
    min_price: row.min_price !== null ? parseFloat(row.min_price) : null,
    max_price: row.max_price !== null ? parseFloat(row.max_price) : null,
    variant_count: parseInt(row.variant_count, 10) || 0,
    categories: Array.isArray(row.categories) ? row.categories : [],
  }));

  const totalPages = Math.ceil(totalCount / limit) || 1;

  return {
    products,
    pagination: {
      page,
      limit,
      total_count: totalCount,
      total_pages: totalPages,
    },
  };
}

function positiveQueryInteger(value, field, fallback, maximum) {
  if (value === undefined || value === '') return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) { const error = new Error(`${field} must be a positive integer`); error.status = 400; throw error; }
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1 || number > maximum) { const error = new Error(`${field} must be between 1 and ${maximum}`); error.status = 400; throw error; }
  return number;
}

function optionalQueryString(value, field, maximum) {
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'string') { const error = new Error(`${field} must be a string`); error.status = 400; throw error; }
  const normalized = value.trim();
  if (normalized.length > maximum) { const error = new Error(`${field} must be ${maximum} characters or fewer`); error.status = 400; throw error; }
  return normalized || undefined;
}

function optionalPrice(value, field) {
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'string' || !/^\d+(?:\.\d{1,2})?$/.test(value) || Number(value) > 99999999.99) {
    const error = new Error(`${field} must be a non-negative amount with at most two decimal places`); error.status = 400; throw error;
  }
  return Number(value);
}

/**
 * Service to fetch detailed product information including active variants, attributes, and image metadata.
 *
 * @param {number} productId
 * @returns {Promise<Object|null>}
 */
async function getProductDetails(productId) {
  const product = await productModel.findProductById(productId);
  if (!product) {
    return null;
  }

  const [images, variants, categories] = await Promise.all([
    productModel.findProductImages(productId),
    productModel.findProductVariants(productId),
    productModel.findProductCategories(productId),
  ]);

  return {
    product: {
      product_id: product.product_id,
      product_name: product.product_name,
      brand: product.brand,
      description: product.description,
      base_sku: product.base_sku,
      images: images.map((img) => ({
        image_id: img.image_id,
        sort_order: img.sort_order,
        is_primary: img.is_primary,
      })),
      variants: variants.map((v) => ({
        variant_id: v.variant_id,
        variant_sku: v.variant_sku,
        variant_name: v.variant_name,
        price: parseFloat(v.price),
        stock_quantity: parseInt(v.stock_quantity, 10),
        attributes: Array.isArray(v.attributes) ? v.attributes : [],
      })),
      categories: categories.map((c) => ({
        category_id: c.category_id,
        category_name: c.category_name,
      })),
    },
  };
}

module.exports = {
  getProductsList,
  getProductDetails,
  positiveQueryInteger,
  optionalQueryString,
  optionalPrice,
};
