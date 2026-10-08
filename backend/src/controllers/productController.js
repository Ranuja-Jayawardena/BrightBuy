const productService = require('../services/productService');

/**
 * Controller to list products with pagination, search, category filter, brand, and sort.
 * Route: GET /api/products
 */
async function getProducts(req, res, next) {
  try {
    const result = await productService.getProductsList(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to get product detail by ID with active variants, attributes, and image metadata.
 * Route: GET /api/products/:id
 */
async function getProductById(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const result = await productService.getProductDetails(id);
    if (!result) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProducts,
  getProductById,
};
