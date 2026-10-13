jest.mock('../src/services/imageService', () => ({ getImageById: jest.fn() }));

const express = require('express');
const request = require('supertest');
const imageService = require('../src/services/imageService');
const productRoutes = require('../src/routes/productRoutes');
const imageRoutes = require('../src/routes/imageRoutes');

const app = express();
app.use('/api/products', productRoutes);
app.use('/api/images', imageRoutes);

test.each(['/api/images/7', '/api/products/images/7'])('%s redirects to the image URL', async path => {
  const imageUrl = 'https://bucket.s3.us-east-1.amazonaws.com/products/7/example.webp';
  imageService.getImageById.mockResolvedValue({ image_url: imageUrl });
  const response = await request(app).get(path);
  expect(response.status).toBe(302);
  expect(response.headers.location).toBe(imageUrl);
});
