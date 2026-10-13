process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'fix87_test_access_secret';

jest.mock('../src/config/db', () => ({ query: jest.fn(), on: jest.fn() }));
jest.mock('../src/models/adminCategoryModel', () => ({
  findAllCategories: jest.fn(),
  findCategoryById: jest.fn(),
  createCategory: jest.fn(),
  updateCategory: jest.fn(),
}));

const request = require('supertest');
const app = require('../src/index');
const db = require('../src/config/db');
const model = require('../src/models/adminCategoryModel');
const { signAccessToken } = require('../src/utils/jwt');

const token = signAccessToken({ user_id: 1, role: 'admin' });
const auth = () => ({ rows: [{ employee_id: 1, role: 'catalog_manager', is_active: true }] });

beforeEach(() => jest.clearAllMocks());

test('category API maps database cycle rejection to HTTP 400', async () => {
  db.query.mockResolvedValueOnce(auth()).mockResolvedValueOnce({ rows: [] });
  model.findCategoryById
    .mockResolvedValueOnce({ category_id: 1, category_name: 'Root', parent_category_id: null })
    .mockResolvedValueOnce({ category_id: 2, category_name: 'Child', parent_category_id: null });
  const databaseError = Object.assign(new Error('Circular category hierarchy'), {
    code: 'P0001', constraint: 'categories_acyclic_parent',
  });
  model.updateCategory.mockRejectedValueOnce(databaseError);

  const response = await request(app)
    .put('/api/admin/categories/1')
    .set('Cookie', [`access_token=${token}`])
    .send({ parent_category_id: 2 });

  expect(response.status).toBe(400);
  expect(response.body).toEqual({ error: 'invalid_request', message: 'Circular category hierarchy', statusCode: 400 });
  expect(db.query.mock.calls[1][0]).toContain('ANY(a.visited)');
});

test('category API rejects self-parenting before the write', async () => {
  db.query.mockResolvedValueOnce(auth());
  model.findCategoryById.mockResolvedValueOnce({ category_id: 1, category_name: 'Root', parent_category_id: null });

  const response = await request(app)
    .put('/api/admin/categories/1')
    .set('Cookie', [`access_token=${token}`])
    .send({ parent_category_id: 1 });

  expect(response.status).toBe(400);
  expect(model.updateCategory).not.toHaveBeenCalled();
});

test('category API rejects a longer ancestor cycle before the write', async () => {
  db.query.mockResolvedValueOnce(auth()).mockResolvedValueOnce({ rows: [{ category_id: 1 }] });
  model.findCategoryById.mockResolvedValueOnce({ category_id: 1, category_name: 'Root', parent_category_id: null });

  const response = await request(app)
    .put('/api/admin/categories/1')
    .set('Cookie', [`access_token=${token}`])
    .send({ parent_category_id: 3 });

  expect(response.status).toBe(400);
  expect(response.body.message).toBe('Circular category hierarchy');
  expect(model.updateCategory).not.toHaveBeenCalled();
});

test('category tree includes active and inactive descendants', async () => {
  db.query.mockResolvedValueOnce(auth());
  model.findAllCategories.mockResolvedValueOnce([
    { category_id: 1, parent_category_id: null, is_active: true },
    { category_id: 2, parent_category_id: 1, is_active: false },
    { category_id: 3, parent_category_id: 2, is_active: true },
  ]);
  const response = await request(app)
    .get('/api/admin/categories')
    .set('Cookie', [`access_token=${token}`]);

  expect(response.status).toBe(200);
  expect(response.body.categories[0].children[0].children[0].category_id).toBe(3);
});
