const service = require('../services/adminCategoryService');

async function list(req, res, next) {
  try { res.status(200).json(await service.listCategories()); } catch (error) { next(error); }
}

async function create(req, res, next) {
  try { res.status(201).json(await service.createCategory(req.body)); } catch (error) { next(error); }
}

async function update(req, res, next) {
  try {
    const result = await service.updateCategory(service.positiveId(req.params.id, 'id'), req.body);
    if (!result) return res.status(404).json({ error: 'Category not found' });
    res.status(200).json(result);
  } catch (error) { next(error); }
}

async function remove(req, res, next) {
  try {
    const result = await service.deleteCategory(service.positiveId(req.params.id, 'id'));
    if (!result) return res.status(404).json({ error: 'Category not found' });
    res.status(200).json(result);
  } catch (error) { next(error); }
}

module.exports = { list, create, update, remove };
