const db = require('../config/db');
const { hashPassword, comparePassword } = require('../utils/password');
const { signAccessToken, signRefreshToken, verifyRefreshToken, verifyAccessToken } = require('../utils/jwt');
const notificationService = require('../services/notificationService');

const isProduction = process.env.NODE_ENV === 'production';
const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'strict',
  path: '/',
};

const register = async (req, res, next) => {
  const client = await db.connect();
  try {
    const { email, password, first_name, last_name, phone } = req.body;
    
    const userCheck = await client.query('SELECT 1 FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      return res.status(409).json({ error: "Email already exists" });
    }

    await client.query('BEGIN');

    const hashedPassword = await hashPassword(password);
    
    const userResult = await client.query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING user_id, email, role',
      [email, hashedPassword, 'customer']
    );
    const user = userResult.rows[0];

    await client.query(
      'INSERT INTO customers (user_id, first_name, last_name, phone) VALUES ($1, $2, $3, $4)',
      [user.user_id, first_name, last_name, phone || null]
    );

    const accessToken = signAccessToken({ user_id: user.user_id, role: user.role });
    const refreshToken = signRefreshToken({ user_id: user.user_id });

    const refreshHash = await hashPassword(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await client.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.user_id, refreshHash, expiresAt]
    );

    await client.query('COMMIT');

    // Trigger Welcome Email (Phase 8.2 - non-blocking after DB commit)
    notificationService.sendWelcome({
      email: user.email,
      firstName: first_name,
      lastName: last_name,
    }).catch(err => console.error('[Auth] Failed to send welcome email:', err));

    res.cookie('access_token', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
    res.cookie('refresh_token', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

    res.status(201).json({
      message: "Registration successful",
      user: {
        user_id: user.user_id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const userResult = await db.query('SELECT user_id, email, password_hash, role FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = userResult.rows[0];
    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    let employee_role = undefined;
    let employee_id = undefined;
    let first_name = undefined;
    let last_name = undefined;
    if (user.role !== 'customer') {
      const empRes = await db.query('SELECT employee_id, role, first_name, last_name, is_active FROM employees WHERE user_id = $1', [user.user_id]);
      if (empRes.rows.length > 0) {
        if (empRes.rows[0].is_active === false) {
          return res.status(403).json({ error: "Employee account has been deactivated. Contact Super Admin." });
        }
        employee_role = empRes.rows[0].role;
        employee_id = empRes.rows[0].employee_id;
        first_name = empRes.rows[0].first_name;
        last_name = empRes.rows[0].last_name;
      }
    }

    const accessToken = signAccessToken({ user_id: user.user_id, role: user.role });
    const refreshToken = signRefreshToken({ user_id: user.user_id });

    const refreshHash = await hashPassword(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.user_id, refreshHash, expiresAt]
    );

    res.cookie('access_token', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
    res.cookie('refresh_token', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

    res.status(200).json({
      message: "Login successful",
      user: {
        user_id: user.user_id,
        email: user.email,
        role: user.role,
        ...(first_name && { first_name }),
        ...(last_name && { last_name }),
        ...(employee_id && { employee_id }),
        ...(employee_role && { employee_role })
      }
    });
  } catch (error) {
    next(error);
  }
};

const refresh = async (req, res, next) => {
  try {
    const { refresh_token } = req.cookies;
    if (!refresh_token) {
      return res.status(401).json({ error: "Invalid or expired refresh token" });
    }

    let payload;
    try {
      payload = verifyRefreshToken(refresh_token);
    } catch (_err) {
      return res.status(401).json({ error: "Invalid or expired refresh token" });
    }

    const tokensResult = await db.query(
      'SELECT token_id, token_hash FROM refresh_tokens WHERE user_id = $1 AND expires_at > NOW()',
      [payload.user_id]
    );

    let foundTokenId = null;
    for (const row of tokensResult.rows) {
      const isMatch = await comparePassword(refresh_token, row.token_hash);
      if (isMatch) {
        foundTokenId = row.token_id;
        break;
      }
    }

    if (!foundTokenId) {
      return res.status(401).json({ error: "Invalid or expired refresh token" });
    }

    await db.query('DELETE FROM refresh_tokens WHERE token_id = $1', [foundTokenId]);

    const userResult = await db.query('SELECT role FROM users WHERE user_id = $1', [payload.user_id]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: "Invalid or expired refresh token" });
    }
    const role = userResult.rows[0].role;
    if (role !== 'customer') {
      const empCheck = await db.query('SELECT is_active FROM employees WHERE user_id = $1', [payload.user_id]);
      if (empCheck.rows.length > 0 && empCheck.rows[0].is_active === false) {
        return res.status(403).json({ error: "Employee account has been deactivated. Contact Super Admin." });
      }
    }

    const newAccessToken = signAccessToken({ user_id: payload.user_id, role });
    const newRefreshToken = signRefreshToken({ user_id: payload.user_id });

    const newRefreshHash = await hashPassword(newRefreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [payload.user_id, newRefreshHash, expiresAt]
    );

    res.cookie('access_token', newAccessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
    res.cookie('refresh_token', newRefreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

    res.status(200).json({ message: "Token refreshed" });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const { refresh_token } = req.cookies;
    
    if (refresh_token) {
      try {
        const payload = verifyRefreshToken(refresh_token);
        const tokensResult = await db.query(
          'SELECT token_id, token_hash FROM refresh_tokens WHERE user_id = $1',
          [payload.user_id]
        );
        for (const row of tokensResult.rows) {
          const isMatch = await comparePassword(refresh_token, row.token_hash);
          if (isMatch) {
            await db.query('DELETE FROM refresh_tokens WHERE token_id = $1', [row.token_id]);
            break;
          }
        }
      } catch (_err) {
        // Ignore invalid or expired token on logout; proceed to clear cookies
      }
    }

    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    res.status(200).json({ message: "Logged out" });
  } catch (error) {
    next(error);
  }
};

const me = async (req, res, next) => {
  try {
    const { access_token } = req.cookies;
    if (!access_token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    let payload;
    try {
      payload = verifyAccessToken(access_token);
    } catch (_err) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const userResult = await db.query(`
      SELECT u.user_id, u.email, u.role, c.first_name, c.last_name, c.phone
      FROM users u
      LEFT JOIN customers c ON u.user_id = c.user_id
      WHERE u.user_id = $1
    `, [payload.user_id]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = userResult.rows[0];
    if (user.role !== 'customer') {
      const empResult = await db.query('SELECT first_name, last_name, phone, employee_id, role, is_active FROM employees WHERE user_id = $1', [payload.user_id]);
      if (empResult.rows.length > 0) {
        if (empResult.rows[0].is_active === false) {
          return res.status(403).json({ error: "Employee account has been deactivated. Contact Super Admin." });
        }
        user.first_name = empResult.rows[0].first_name;
        user.last_name = empResult.rows[0].last_name;
        user.phone = empResult.rows[0].phone;
        user.employee_id = empResult.rows[0].employee_id;
        user.employee_role = empResult.rows[0].role;
        user.is_active = empResult.rows[0].is_active;
      }
    }

    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { first_name, last_name, phone } = req.body;

    if (!first_name || typeof first_name !== 'string' || !first_name.trim() || first_name.trim().length > 50) {
      return res.status(400).json({ error: 'First name is required and must be 1-50 characters' });
    }
    if (!last_name || typeof last_name !== 'string' || !last_name.trim() || last_name.trim().length > 50) {
      return res.status(400).json({ error: 'Last name is required and must be 1-50 characters' });
    }
    if (phone !== undefined && phone !== null && phone !== '') {
      if (typeof phone !== 'string' || phone.trim().length > 20) {
        return res.status(400).json({ error: 'Phone must be at most 20 characters' });
      }
    }

    const trimmedFirstName = first_name.trim();
    const trimmedLastName = last_name.trim();
    const trimmedPhone = (phone && typeof phone === 'string' && phone.trim()) ? phone.trim() : null;

    if (req.user.role === 'customer') {
      const result = await db.query(
        `UPDATE customers
         SET first_name = $1, last_name = $2, phone = $3, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $4
         RETURNING customer_id, user_id, first_name, last_name, phone`,
        [trimmedFirstName, trimmedLastName, trimmedPhone, req.user.user_id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Customer profile not found' });
      }

      const userEmailResult = await db.query('SELECT email FROM users WHERE user_id = $1', [req.user.user_id]);
      const email = userEmailResult.rows.length > 0 ? userEmailResult.rows[0].email : undefined;

      const customer = result.rows[0];
      return res.status(200).json({
        message: 'Profile updated successfully',
        user: {
          user_id: req.user.user_id,
          email,
          role: 'customer',
          first_name: customer.first_name,
          last_name: customer.last_name,
          phone: customer.phone,
        },
      });
    } else {
      const result = await db.query(
        `UPDATE employees
         SET first_name = $1, last_name = $2, phone = $3
         WHERE user_id = $4
         RETURNING employee_id, user_id, first_name, last_name, phone, role, is_active`,
        [trimmedFirstName, trimmedLastName, trimmedPhone, req.user.user_id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Employee profile not found' });
      }

      const userEmailResult = await db.query('SELECT email FROM users WHERE user_id = $1', [req.user.user_id]);
      const email = userEmailResult.rows.length > 0 ? userEmailResult.rows[0].email : undefined;

      const emp = result.rows[0];
      return res.status(200).json({
        message: 'Profile updated successfully',
        user: {
          user_id: req.user.user_id,
          email,
          role: req.user.role,
          first_name: emp.first_name,
          last_name: emp.last_name,
          phone: emp.phone,
          employee_id: emp.employee_id,
          employee_role: emp.role,
          is_active: emp.is_active,
        },
      });
    }
  } catch (error) {
    next(error);
  }
};

const updatePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || typeof current_password !== 'string') {
      return res.status(400).json({ error: 'Current password is required' });
    }
    if (!new_password || typeof new_password !== 'string' || new_password.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }

    const userResult = await db.query('SELECT password_hash FROM users WHERE user_id = $1', [req.user.user_id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await comparePassword(current_password, userResult.rows[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    const hashedPassword = await hashPassword(new_password);
    await db.query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [hashedPassword, req.user.user_id]);

    return res.status(200).json({
      message: 'Password updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  me,
  updateProfile,
  updatePassword
};
