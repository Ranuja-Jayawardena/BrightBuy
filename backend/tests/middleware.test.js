process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_1234567890_test';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_1234567890_test';

const { requireAuth, requireRole, requireStaffRole } = require('../src/middleware/authMiddleware');
const { signAccessToken } = require('../src/utils/jwt');
const db = require('../src/config/db');

jest.mock('../src/config/db', () => ({
  query: jest.fn(),
  on: jest.fn(),
}));

describe('Auth Middleware & Role Guards', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      cookies: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    next = jest.fn();
  });

  describe('requireAuth', () => {
    it('should return 401 with standard error format if access_token cookie is missing', async () => {
      await requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Not authenticated',
          message: 'Authentication required to access this resource',
          statusCode: 401,
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if access_token signature is invalid or expired', async () => {
      req.cookies.access_token = 'invalid.jwt.token';

      await requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Not authenticated',
          message: 'Invalid or expired access token',
          statusCode: 401,
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should set req.user and call next() when valid customer token provided', async () => {
      const token = signAccessToken({ user_id: 10, role: 'customer' });
      req.cookies.access_token = token;

      db.query.mockResolvedValueOnce({
        rows: [{ customer_id: 55 }],
      });

      await requireAuth(req, res, next);

      expect(req.user).toEqual({
        user_id: 10,
        role: 'customer',
        customer_id: 55,
      });
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should set req.user and call next() when valid admin/staff token provided', async () => {
      const token = signAccessToken({ user_id: 12, role: 'admin' });
      req.cookies.access_token = token;

      db.query.mockResolvedValueOnce({
        rows: [{ employee_id: 7, role: 'inventory_manager' }],
      });

      await requireAuth(req, res, next);

      expect(req.user).toEqual({
        user_id: 12,
        role: 'admin',
        employee_id: 7,
        employee_role: 'inventory_manager',
      });
      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('should return 403 when req.user has insufficient role', () => {
      req.user = { user_id: 1, role: 'customer' };
      const guard = requireRole('admin', 'inventory_manager');

      guard(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Forbidden: Insufficient privileges',
          message: 'You do not have permission to access this resource',
          statusCode: 403,
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next() when user role is in allowed roles', () => {
      req.user = { user_id: 2, role: 'admin' };
      const guard = requireRole('admin', 'inventory_manager');

      guard(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('requireStaffRole', () => {
    it('should reject non-admin users with 403', () => {
      req.user = { user_id: 5, role: 'customer' };
      const guard = requireStaffRole('inventory_manager');

      guard(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Forbidden: Insufficient privileges',
          message: 'Administrative staff privileges required',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow super_admin regardless of specific allowed roles', () => {
      req.user = { user_id: 1, role: 'admin', employee_role: 'super_admin' };
      const guard = requireStaffRole('order_dispatcher');

      guard(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow user if employee_role matches allowed roles', () => {
      req.user = { user_id: 2, role: 'admin', employee_role: 'inventory_manager' };
      const guard = requireStaffRole('inventory_manager', 'catalog_manager');

      guard(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject user if employee_role does not match allowed roles', () => {
      req.user = { user_id: 3, role: 'admin', employee_role: 'order_dispatcher' };
      const guard = requireStaffRole('inventory_manager');

      guard(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Forbidden: Insufficient privileges',
          message: 'Your staff role (order_dispatcher) does not have permission for this resource',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should fallback to super_admin if employee_role is not defined', () => {
      req.user = { user_id: 4, role: 'admin' };
      const guard = requireStaffRole('inventory_manager');

      guard(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
