const imageService = require('../services/imageService');

/**
 * Controller to serve a product image by image_id.
 * Handles ETag / If-None-Match for 304 Not Modified.
 * Route: GET /api/images/:id
 */
async function getImage(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const image = await imageService.getImageById(id);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const { imageData, mimeType, etag } = image;

    // Check If-None-Match header for conditional request
    const clientETag = req.headers['if-none-match'];
    if (clientETag && clientETag === etag) {
      return res.status(304).end();
    }

    res.set({
      'Content-Type': mimeType,
      'Content-Length': imageData.length,
      'Cache-Control': 'public, max-age=86400',
      'ETag': etag,
    });

    res.status(200).send(imageData);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getImage,
};
