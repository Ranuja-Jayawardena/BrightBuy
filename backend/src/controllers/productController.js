const productService = require('../services/productService');

/**
 * Controller to list products with pagination, search, category, brand, price range, and sort.
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
    if (!/^\d+$/.test(req.params.id) || !Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'invalid_request', message: 'id must be a positive integer', statusCode: 400 });
    }

    const result = await productService.getProductDetails(id);
    if (!result) {
      return res.status(404).json({ error: 'not_found', message: 'Product not found', statusCode: 404 });
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
