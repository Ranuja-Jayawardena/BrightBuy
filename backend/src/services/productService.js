const productModel = require('../models/productModel');

/**
 * Service to fetch paginated product list with search, filtering, and sorting.
 *
 * @param {Object} queryParams
 * @returns {Promise<Object>}
 */
async function getProductsList(queryParams) {
  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(queryParams.limit, 10) || 12));
  const search = queryParams.search && queryParams.search.trim() ? queryParams.search.trim() : undefined;
  const brand = queryParams.brand && queryParams.brand.trim() ? queryParams.brand.trim() : undefined;
  const categoryId = queryParams.category_id ? parseInt(queryParams.category_id, 10) : undefined;
  const sort = queryParams.sort;

  const { rows, totalCount } = await productModel.findProducts({
    page,
    limit,
    search,
    categoryId: Number.isInteger(categoryId) && categoryId > 0 ? categoryId : undefined,
    brand,
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
};
