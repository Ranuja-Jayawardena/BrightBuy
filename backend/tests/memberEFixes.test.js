process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_1234567890_test';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_1234567890_test';
process.env.FRONTEND_URL = 'http://localhost:3000';

const request = require('supertest');
const bcrypt = require('bcryptjs');
const db = require('../src/config/db');
const { signAccessToken } = require('../src/utils/jwt');

// Mock database pool
jest.mock('../src/config/db', () => ({
  query: jest.fn(),
  connect: jest.fn(),
  on: jest.fn(),
}));

const app = require('../src/index');

describe('Member E Fixes: Profile Management (Fix 1.1) & Employee Lifecycle (Fix 4.2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Fix 1.1: Customer Profile Management (PUT /api/auth/profile)', () => {
    it('should update customer profile successfully (200)', async () => {
      const token = signAccessToken({ user_id: 14, role: 'customer' });

      // Mock customer lookup and update
      db.query
        .mockResolvedValueOnce({ rows: [{ customer_id: 5 }] }) // requireAuth customer lookup
        .mockResolvedValueOnce({
          rows: [
            { customer_id: 5, user_id: 14, first_name: 'Jane', last_name: 'Doe', phone: '+1-555-0199' },
          ],
        }) // update customer
        .mockResolvedValueOnce({ rows: [{ email: 'jane@example.com' }] }); // fetch email

      const res = await request(app)
        .put('/api/auth/profile')
        .set('Cookie', [`access_token=${token}`])
        .send({
          first_name: 'Jane',
          last_name: 'Doe',
          phone: '+1-555-0199',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Profile updated successfully');
      expect(res.body.user).toEqual({
        user_id: 14,
        email: 'jane@example.com',
        role: 'customer',
        first_name: 'Jane',
        last_name: 'Doe',
        phone: '+1-555-0199',
      });
    });

    it('should reject profile update if first_name is missing or invalid (400)', async () => {
      const token = signAccessToken({ user_id: 14, role: 'customer' });

      db.query.mockResolvedValueOnce({ rows: [{ customer_id: 5 }] }); // requireAuth

      const res = await request(app)
        .put('/api/auth/profile')
        .set('Cookie', [`access_token=${token}`])
        .send({
          first_name: '',
          last_name: 'Doe',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/First name is required/);
    });

    it('should reject profile update if phone exceeds 20 characters (400)', async () => {
      const token = signAccessToken({ user_id: 14, role: 'customer' });

      db.query.mockResolvedValueOnce({ rows: [{ customer_id: 5 }] }); // requireAuth

      const res = await request(app)
        .put('/api/auth/profile')
        .set('Cookie', [`access_token=${token}`])
        .send({
          first_name: 'Jane',
          last_name: 'Doe',
          phone: '1234567890123456789012345',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Phone must be at most 20 characters/);
    });

    it('should reject unauthenticated profile update request (401)', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .send({
          first_name: 'Jane',
          last_name: 'Doe',
        });

      expect(res.status).toBe(401);
    });
  });

  describe('Fix 1.1: Password Management (PUT /api/auth/password)', () => {
    it('should update password successfully when current password matches (200)', async () => {
      const token = signAccessToken({ user_id: 14, role: 'customer' });
      const currentPasswordHash = await bcrypt.hash('OldPassword123!', 4);

      db.query
        .mockResolvedValueOnce({ rows: [{ customer_id: 5 }] }) // requireAuth
        .mockResolvedValueOnce({ rows: [{ password_hash: currentPasswordHash }] }) // fetch user password_hash
        .mockResolvedValueOnce({}); // update password_hash

      const res = await request(app)
        .put('/api/auth/password')
        .set('Cookie', [`access_token=${token}`])
        .send({
          current_password: 'OldPassword123!',
          new_password: 'NewSecurePassword456!',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Password updated successfully');
    });

    it('should reject password update if current password is wrong (400)', async () => {
      const token = signAccessToken({ user_id: 14, role: 'customer' });
      const currentPasswordHash = await bcrypt.hash('CorrectPassword123!', 4);

      db.query
        .mockResolvedValueOnce({ rows: [{ customer_id: 5 }] }) // requireAuth
        .mockResolvedValueOnce({ rows: [{ password_hash: currentPasswordHash }] }); // fetch user password_hash

      const res = await request(app)
        .put('/api/auth/password')
        .set('Cookie', [`access_token=${token}`])
        .send({
          current_password: 'WrongPassword123!',
          new_password: 'NewSecurePassword456!',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Incorrect current password');
    });

    it('should reject password update if new password is too short (400)', async () => {
      const token = signAccessToken({ user_id: 14, role: 'customer' });

      db.query.mockResolvedValueOnce({ rows: [{ customer_id: 5 }] }); // requireAuth

      const res = await request(app)
        .put('/api/auth/password')
        .set('Cookie', [`access_token=${token}`])
        .send({
          current_password: 'OldPassword123!',
          new_password: 'short',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/New password must be at least 8 characters long/);
    });
  });

  describe('Fix 4.2: Deactivated Employee Login & Middleware Access Control', () => {
    it('should reject deactivated employee login with 403 Forbidden', async () => {
      const hashedPassword = await bcrypt.hash('AdminPassword123!', 4);

      db.query
        .mockResolvedValueOnce({
          rows: [{ user_id: 2, email: 'inactive@example.com', password_hash: hashedPassword, role: 'admin' }],
        }) // query user
        .mockResolvedValueOnce({
          rows: [{ employee_id: 3, role: 'catalog_manager', first_name: 'Marcus', last_name: 'Vance', is_active: false }],
        }); // query employee with is_active = false

      const res = await request(app)
        .post('/api/auth/login')
        .set('x-skip-rate-limit', 'true')
        .send({
          email: 'inactive@example.com',
          password: 'AdminPassword123!',
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Employee account has been deactivated. Contact Super Admin.');
    });

    it('should reject deactivated employee in requireAuth middleware with 403 Forbidden', async () => {
      const token = signAccessToken({ user_id: 2, role: 'admin' });

      db.query.mockResolvedValueOnce({
        rows: [{ employee_id: 3, role: 'catalog_manager', is_active: false }],
      }); // requireAuth employee lookup

      const res = await request(app)
        .get('/api/admin/employees')
        .set('Cookie', [`access_token=${token}`]);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Employee account has been deactivated. Contact Super Admin.');
    });

    it('should reject deactivated employee in GET /api/auth/me with 403 Forbidden', async () => {
      const token = signAccessToken({ user_id: 2, role: 'admin' });

      db.query
        .mockResolvedValueOnce({
          rows: [{ user_id: 2, email: 'emp@example.com', role: 'admin', first_name: null, last_name: null, phone: null }],
        })
        .mockResolvedValueOnce({
          rows: [{ employee_id: 3, role: 'catalog_manager', first_name: 'Marcus', last_name: 'Vance', phone: '1234', is_active: false }],
        });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [`access_token=${token}`]);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Employee account has been deactivated. Contact Super Admin.');
    });
  });

  describe('Fix 4.2: Super Admin Employee Management Endpoints', () => {
    const superAdminToken = signAccessToken({ user_id: 1, role: 'admin' });

    it('should list employees including is_active status (200)', async () => {
      db.query
        .mockResolvedValueOnce({
          rows: [{ employee_id: 1, role: 'super_admin', is_active: true }],
        }) // requireAuth
        .mockResolvedValueOnce({
          rows: [
            { employee_id: 1, user_id: 1, email: 'admin@brightbuy.com', first_name: 'Admin', last_name: 'User', phone: null, role: 'super_admin', is_active: true },
            { employee_id: 2, user_id: 2, email: 'marcus@brightbuy.com', first_name: 'Marcus', last_name: 'Vance', phone: '+1-555-0812', role: 'catalog_manager', is_active: false },
          ],
        }); // listEmployees

      const res = await request(app)
        .get('/api/admin/employees')
        .set('Cookie', [`access_token=${superAdminToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.employees).toHaveLength(2);
      expect(res.body.employees[1].is_active).toBe(false);
    });

    it('should update employee details and role (PUT /api/admin/employees/:id) (200)', async () => {
      db.query
        .mockResolvedValueOnce({
          rows: [{ employee_id: 1, role: 'super_admin', is_active: true }],
        }) // requireAuth
        .mockResolvedValueOnce({
          rows: [{ employee_id: 2, user_id: 2, role: 'order_dispatcher', first_name: 'Marcus', last_name: 'Vance', phone: null, is_active: true }],
        }) // getEmployeeById
        .mockResolvedValueOnce({
          rows: [{ employee_id: 2, user_id: 2, first_name: 'Marcus', last_name: 'Vance', phone: '+1-555-0812', role: 'catalog_manager', is_active: true }],
        }); // updateEmployee

      const res = await request(app)
        .put('/api/admin/employees/2')
        .set('Cookie', [`access_token=${superAdminToken}`])
        .send({
          first_name: 'Marcus',
          last_name: 'Vance',
          phone: '+1-555-0812',
          role: 'catalog_manager',
        });

      expect(res.status).toBe(200);
      expect(res.body.employee).toEqual({
        employee_id: 2,
        user_id: 2,
        first_name: 'Marcus',
        last_name: 'Vance',
        phone: '+1-555-0812',
        role: 'catalog_manager',
        is_active: true,
      });
    });

    it('should prevent super admin from demoting their own account (400)', async () => {
      db.query
        .mockResolvedValueOnce({
          rows: [{ employee_id: 1, role: 'super_admin', is_active: true }],
        }) // requireAuth (logged-in employee_id is 1)
        .mockResolvedValueOnce({
          rows: [{ employee_id: 1, user_id: 1, role: 'super_admin', first_name: 'Admin', last_name: 'User', phone: null, is_active: true }],
        }); // getEmployeeById for employee 1

      const res = await request(app)
        .put('/api/admin/employees/1')
        .set('Cookie', [`access_token=${superAdminToken}`])
        .send({
          role: 'catalog_manager',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Super admins cannot demote their own account');
    });

    it('should prevent demoting the last active super admin in the system (400)', async () => {
      db.query
        .mockResolvedValueOnce({
          rows: [{ employee_id: 10, role: 'super_admin', is_active: true }],
        }) // requireAuth (logged in as employee 10)
        .mockResolvedValueOnce({
          rows: [{ employee_id: 1, user_id: 1, role: 'super_admin', first_name: 'Root', last_name: 'Admin', phone: null, is_active: true }],
        }) // target employee 1 is super_admin
        .mockResolvedValueOnce({
          rows: [{ count: 1 }],
        }); // countActiveSuperAdmins returns 1

      const res = await request(app)
        .put('/api/admin/employees/1')
        .set('Cookie', [`access_token=${superAdminToken}`])
        .send({
          role: 'analyst',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Cannot demote the last active super admin');
    });

    it('should toggle employee active status (PATCH /api/admin/employees/:id/status) (200)', async () => {
      db.query
        .mockResolvedValueOnce({
          rows: [{ employee_id: 1, role: 'super_admin', is_active: true }],
        }) // requireAuth
        .mockResolvedValueOnce({
          rows: [{ employee_id: 2, role: 'catalog_manager', is_active: true }],
        }) // getEmployeeById
        .mockResolvedValueOnce({
          rows: [{ employee_id: 2, is_active: false }],
        }); // setEmployeeStatus

      const res = await request(app)
        .patch('/api/admin/employees/2/status')
        .set('Cookie', [`access_token=${superAdminToken}`])
        .send({
          is_active: false,
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        message: 'Employee deactivated successfully',
        employee_id: 2,
        is_active: false,
      });
    });

    it('should prevent super admin self-deactivation (400)', async () => {
      db.query
        .mockResolvedValueOnce({
          rows: [{ employee_id: 1, role: 'super_admin', is_active: true }],
        }) // requireAuth (employee_id = 1)
        .mockResolvedValueOnce({
          rows: [{ employee_id: 1, role: 'super_admin', is_active: true }],
        }); // getEmployeeById

      const res = await request(app)
        .patch('/api/admin/employees/1/status')
        .set('Cookie', [`access_token=${superAdminToken}`])
        .send({
          is_active: false,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Super admins cannot deactivate their own account');
    });

    it('should prevent non-super admin staff from accessing employee management endpoints (403)', async () => {
      const inventoryManagerToken = signAccessToken({ user_id: 3, role: 'admin' });

      db.query.mockResolvedValueOnce({
        rows: [{ employee_id: 5, role: 'inventory_manager', is_active: true }],
      }); // requireAuth

      const res = await request(app)
        .get('/api/admin/employees')
        .set('Cookie', [`access_token=${inventoryManagerToken}`]);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/staff role/);
    });
  });
});
