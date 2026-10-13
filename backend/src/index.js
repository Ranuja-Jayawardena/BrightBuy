const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const { apiLimiter } = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust reverse proxy (Nginx) headers like X-Forwarded-For
app.set('trust proxy', 1);

// Security Headers via Helmet (XSS, HSTS, Sniffing, Frameguard)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow frontend to load media/images
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));

// CORS Configuration - Restrict to frontend origin and allow credentials
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'x-skip-rate-limit'],
  exposedHeaders: ['set-cookie'],
  maxAge: 86400,
}));

// Webhook route needs raw body, mount before express.json()
app.use('/api/webhooks', require('./routes/webhookRoutes'));

// Rate limiting for API endpoints (protect against DoS/abuse)
app.use('/api', apiLimiter);

app.use(express.json());
app.use(cookieParser());

// Base route
app.get('/', (req, res) => {
  res.json({ message: 'BrightBuy API is running' });
});

// Basic health check (DB health check wired in Phase 1.2)
const db = require('./config/db');
app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.status(200).json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ status: 'error', database: 'disconnected', timestamp: new Date().toISOString() });
  }
});

// API Routes
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const imageRoutes = require('./routes/imageRoutes');

const adminRoutes = require('./routes/adminRoutes');
const reportRoutes = require('./routes/reportRoutes');

const cartRoutes = require('./routes/cartRoutes');
const cityRoutes = require('./routes/cityRoutes');
const addressRoutes = require('./routes/addressRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/images', imageRoutes);

app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);

app.use('/api/cart', cartRoutes);
app.use('/api/cities', cityRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);


// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'not_found', message: 'Endpoint not found', statusCode: 404 });
});

// Error handling middleware
app.use((err, req, res, _next) => {
  if (process.env.NODE_ENV !== 'test') {
    console.error('Server error:', err);
  }
  const statusCode = Number.isInteger(err.status) ? err.status : Number.isInteger(err.statusCode) ? err.statusCode : err.code === '23505' ? 409 : (err.code === '23503' || err.code === 'P0001') ? 400 : 500;
  const errorName = err.publicCode || err.error || (statusCode === 409 ? 'conflict' : statusCode >= 500 ? 'internal_error' : 'invalid_request');
  res.status(statusCode).json({
    error: errorName,
    message: statusCode >= 500 ? 'Internal Server Error' : err.code === '23503' ? 'A referenced resource does not exist' : err.message,
    statusCode,
  });
});

const HOST = process.env.HOST || '0.0.0.0';

if (process.env.NODE_ENV !== 'test') {
  require('./services/emailQueue').startEmailWorker();
  app.listen(PORT, HOST, () => {
    console.log(`Backend server running on http://${HOST}:${PORT}`);
  });
}

module.exports = app;
