jest.mock('../src/config/db', () => ({ query: jest.fn() }));

const express = require('express');
const request = require('supertest');
const db = require('../src/config/db');
const productRoutes = require('../src/routes/productRoutes');

const app = express();
app.use('/api/products', productRoutes);

beforeEach(() => jest.clearAllMocks());

test('brands endpoint lists active catalog brands before the product ID route', async () => {
  db.query.mockResolvedValue({ rows: [{ brand: 'ApexGear' }, { brand: 'Heritage' }] });

  const response = await request(app).get('/api/products/brands');

  expect(response.status).toBe(200);
  expect(response.body).toEqual({ brands: ['ApexGear', 'Heritage'] });
  expect(db.query.mock.calls[0][0]).toMatch(/SELECT DISTINCT brand[\s\S]*is_active = true[\s\S]*ORDER BY brand ASC/);
});
