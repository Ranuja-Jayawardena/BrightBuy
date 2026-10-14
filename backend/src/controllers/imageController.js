const imageService = require('../services/imageService');

/**
 * Redirect a legacy image route to its S3 URL.
 * Route: GET /api/images/:id
 */
async function getImage(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!/^\d+$/.test(req.params.id) || !Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'invalid_request', message: 'id must be a positive integer', statusCode: 400 });
    }

    const image = await imageService.getImageById(id);
    if (!image) {
      return res.status(404).json({ error: 'not_found', message: 'Image not found', statusCode: 404 });
    }

    res.redirect(302, image.image_url);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getImage,
};
