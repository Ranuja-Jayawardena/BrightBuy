const adminProductService = require('../services/adminProductService');

function parseId(value) {
  return adminProductService.parsePositiveInteger(value, 'id');
}

async function listProducts(req, res, next) {
  try {
    res.status(200).json(await adminProductService.listProducts(req.query));
  } catch (error) {
    next(error);
  }
}

async function getProduct(req, res, next) {
  try {
    const result = await adminProductService.getProductDetail(parseId(req.params.id));
    if (!result) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function createProduct(req, res, next) {
  try {
    res.status(201).json(await adminProductService.createProduct(req.body));
  } catch (error) {
    next(error);
  }
}

async function updateProduct(req, res, next) {
  try {
    const result = await adminProductService.updateProduct(parseId(req.params.id), req.body);
    if (!result) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function deleteProduct(req, res, next) {
  try {
    const result = await adminProductService.softDeleteProduct(parseId(req.params.id));
    if (!result) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function createImage(req, res, next) {
  try {
    const result = await adminProductService.createImage(parseId(req.params.id), req.file, req.body);
    if (!result) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function updateImage(req, res, next) {
  try {
    const result = await adminProductService.updateImage(parseId(req.params.id), req.body);
    if (!result) {
      return res.status(404).json({ error: 'Image not found' });
    }
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function deleteImage(req, res, next) {
  try {
    const result = await adminProductService.deleteImage(parseId(req.params.id));
    if (!result) {
      return res.status(404).json({ error: 'Image not found' });
    }
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function createVariant(req, res, next) {
  try {
    const result = await adminProductService.createVariant(parseId(req.params.id), req.body);
    if (!result) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function updateVariant(req, res, next) {
  try {
    const result = await adminProductService.updateVariant(parseId(req.params.id), req.body);
    if (!result) {
      return res.status(404).json({ error: 'Variant not found' });
    }
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function deleteVariant(req, res, next) {
  try {
    const result = await adminProductService.softDeleteVariant(parseId(req.params.id));
    if (!result) {
      return res.status(404).json({ error: 'Variant not found' });
    }
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  createImage,
  updateImage,
  deleteImage,
  createVariant,
  updateVariant,
  deleteVariant,
};
