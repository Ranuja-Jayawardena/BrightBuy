const { verifyAccessToken } = require('../utils/jwt');
const db = require('../config/db');

const requireAuth = async (req, res, next) => {
  const { access_token } = req.cookies;

  if (!access_token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const payload = verifyAccessToken(access_token);
    
    let customer_id = null;
    let employee_id = null;
    
    if (payload.role === 'customer') {
      const customerResult = await db.query('SELECT customer_id FROM customers WHERE user_id = $1', [payload.user_id]);
      if (customerResult.rows.length > 0) {
        customer_id = customerResult.rows[0].customer_id;
      }
    } else {
      const employeeResult = await db.query('SELECT employee_id FROM employees WHERE user_id = $1', [payload.user_id]);
      if (employeeResult.rows.length > 0) {
        employee_id = employeeResult.rows[0].employee_id;
      }
    }

    req.user = {
      user_id: payload.user_id,
      role: payload.role,
      ...(customer_id && { customer_id }),
      ...(employee_id && { employee_id })
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
};

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
    }
    next();
  };
};

module.exports = {
  requireAuth,
  requireRole
};
