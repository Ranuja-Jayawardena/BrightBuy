jest.mock('../src/services/imageService', () => ({ getImageById: jest.fn() }));

const express = require('express');
const request = require('supertest');
const imageService = require('../src/services/imageService');
const productRoutes = require('../src/routes/productRoutes');
const imageRoutes = require('../src/routes/imageRoutes');

const app = express();
app.use('/api/products', productRoutes);
app.use('/api/images', imageRoutes);

test.each(['/api/images/7', '/api/products/images/7'])('%s serves identical image bytes', async path => {
  const imageData = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0xff]);
  imageService.getImageById.mockResolvedValue({ imageData, mimeType: 'image/png', etag: 'test-etag' });
  const response = await request(app).get(path);
  expect(response.status).toBe(200);
  expect(response.headers['content-type']).toMatch(/image\/png/);
  expect(response.body).toEqual(imageData);
});
