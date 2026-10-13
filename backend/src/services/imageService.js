const imageModel = require('../models/imageModel');

async function getImageById(imageId) {
  return imageModel.findImageUrlById(imageId);
}

module.exports = {
  getImageById,
};
