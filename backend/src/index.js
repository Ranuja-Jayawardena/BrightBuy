const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Webhook route needs raw body, mount before express.json()
app.use('/api/webhooks', require('./routes/webhookRoutes'));

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
  console.error('Server error:', err);
  const statusCode = Number.isInteger(err.status) ? err.status : err.code === '23505' ? 409 : err.code === '23503' ? 400 : 500;
  res.status(statusCode).json({
    error: err.publicCode || (statusCode === 409 ? 'conflict' : statusCode >= 500 ? 'internal_error' : 'invalid_request'),
    message: statusCode >= 500 ? 'Internal Server Error' : err.code === '23503' ? 'A referenced resource does not exist' : err.message,
    statusCode,
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
