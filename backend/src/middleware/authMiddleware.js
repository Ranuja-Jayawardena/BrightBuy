const { verifyAccessToken } = require('../utils/jwt');
const db = require('../config/db');

const requireAuth = async (req, res, next) => {
  const { access_token } = req.cookies;

  if (!access_token) {
    return res.status(401).json({
      error: 'Not authenticated',
      message: 'Authentication required to access this resource',
      statusCode: 401,
    });
  }

  try {
    const payload = verifyAccessToken(access_token);
    
    let customer_id = null;
    let employee_id = null;
    let employee_role = null;
    
    if (payload.role === 'customer') {
      const customerResult = await db.query('SELECT customer_id FROM customers WHERE user_id = $1', [payload.user_id]);
      if (customerResult.rows.length > 0) {
        customer_id = customerResult.rows[0].customer_id;
      }
    } else {
      const employeeResult = await db.query('SELECT employee_id, role, is_active FROM employees WHERE user_id = $1', [payload.user_id]);
      if (employeeResult.rows.length > 0) {
        if (employeeResult.rows[0].is_active === false) {
          return res.status(403).json({
            error: 'Forbidden: Insufficient privileges',
            message: 'Employee account has been deactivated. Contact Super Admin.',
            statusCode: 403,
          });
        }
        employee_id = employeeResult.rows[0].employee_id;
        employee_role = employeeResult.rows[0].role;
      }
    }

    req.user = {
      user_id: payload.user_id,
      role: payload.role,
      ...(customer_id && { customer_id }),
      ...(employee_id && { employee_id }),
      ...(employee_role && { employee_role })
    };

    next();
  } catch (_error) {
    return res.status(401).json({
      error: 'Not authenticated',
      message: 'Invalid or expired access token',
      statusCode: 401,
    });
  }
};

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden: Insufficient privileges',
        message: 'You do not have permission to access this resource',
        statusCode: 403,
      });
    }
    next();
  };
};

const requireStaffRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden: Insufficient privileges',
        message: 'Administrative staff privileges required',
        statusCode: 403,
      });
    }
    // super_admin always has access to all staff operations (fallback to super_admin if token has role=admin but no explicit employee_role)
    const staffRole = req.user.employee_role || 'super_admin';
    if (staffRole === 'super_admin') {
      return next();
    }
    if (!allowedRoles.includes(staffRole)) {
      return res.status(403).json({
        error: 'Forbidden: Insufficient privileges',
        message: `Your staff role (${staffRole}) does not have permission for this resource`,
        statusCode: 403,
      });
    }
    next();
  };
};

module.exports = {
  requireAuth,
  requireRole,
  requireStaffRole
};
