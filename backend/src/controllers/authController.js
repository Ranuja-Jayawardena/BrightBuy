const db = require('../config/db');
const { hashPassword, comparePassword } = require('../utils/password');
const { signAccessToken, signRefreshToken, verifyRefreshToken, verifyAccessToken } = require('../utils/jwt');

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
        role: user.role
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
    } catch (err) {
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
      } catch (err) {
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
    } catch (err) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const userResult = await db.query(`
      SELECT u.user_id, u.email, u.role, c.first_name, c.last_name
      FROM users u
      LEFT JOIN customers c ON u.user_id = c.user_id
      WHERE u.user_id = $1
    `, [payload.user_id]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = userResult.rows[0];
    if (!user.first_name && user.role !== 'customer') {
      const empResult = await db.query('SELECT first_name, last_name FROM employees WHERE user_id = $1', [payload.user_id]);
      if (empResult.rows.length > 0) {
        user.first_name = empResult.rows[0].first_name;
        user.last_name = empResult.rows[0].last_name;
      }
    }

    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  me
};
