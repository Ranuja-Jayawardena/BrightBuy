const categoryModel = require('../models/categoryModel');

/**
 * Service to build and return the active category hierarchy tree.
 *
 * @returns {Promise<Array<Object>>}
 */
async function getCategoryTree() {
  const categories = await categoryModel.findAllActiveCategories();

  const categoryMap = new Map();
  const roots = [];

  // Create node entries with empty children lists
  categories.forEach((cat) => {
    categoryMap.set(cat.category_id, {
      category_id: cat.category_id,
      category_name: cat.category_name,
      parent_category_id: cat.parent_category_id,
      children: [],
    });
  });

  // Assemble tree hierarchy
  categories.forEach((cat) => {
    const node = categoryMap.get(cat.category_id);
    if (cat.parent_category_id === null || cat.parent_category_id === undefined) {
      roots.push(node);
    } else if (categoryMap.has(cat.parent_category_id)) {
      categoryMap.get(cat.parent_category_id).children.push(node);
    }
  });

  return roots;
}

module.exports = {
  getCategoryTree,
};
