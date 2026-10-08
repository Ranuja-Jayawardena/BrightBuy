const categoryService = require('../services/categoryService');

/**
 * Controller to fetch category hierarchy tree.
 * Route: GET /api/categories
 */
async function getCategories(req, res, next) {
  try {
    const categories = await categoryService.getCategoryTree();
    res.status(200).json({ categories });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getCategories,
};
