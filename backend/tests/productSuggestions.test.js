jest.mock('../src/config/db', () => ({ query: jest.fn() }));

const express = require('express');
const request = require('supertest');
const db = require('../src/config/db');
const productRoutes = require('../src/routes/productRoutes');

const app = express();
app.use('/api/products', productRoutes);
app.use((error, req, res, next) => { void req; void next; res.status(error.status || 500).json({ error: error.message }); });

beforeEach(() => jest.clearAllMocks());

test.each(['/api/products/suggestions', '/api/products/suggestions?q=a', '/api/products/suggestions?q=%20%20'])
('rejects a missing or short search term at %s', async path => {
  const response = await request(app).get(path);
  expect(response.status).toBe(400);
  expect(db.query).not.toHaveBeenCalled();
});

test('suggestions route returns the documented shape and stays ahead of /:id', async () => {
  db.query.mockResolvedValue({ rows: [{ product_id: 7, product_name: 'Camera', brand: 'BrightBuy', category_name: 'Electronics' }] });
  const response = await request(app).get('/api/products/suggestions?q=cam');
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ suggestions: [{ product_id: 7, product_name: 'Camera', brand: 'BrightBuy', category_name: 'Electronics' }] });
  expect(db.query.mock.calls[0][1]).toEqual(['%cam%', 'cam']);
  expect(db.query.mock.calls[0][0]).toContain('LIMIT 6');
});

test('treats SQL wildcard characters as literal search text', async () => {
  db.query.mockResolvedValue({ rows: [] });
  const response = await request(app).get('/api/products/suggestions?q=ca%25');
  expect(response.status).toBe(200);
  expect(db.query.mock.calls[0][1]).toEqual(['%ca\\%%', 'ca%']);
});
