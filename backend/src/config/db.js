const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_APP_USER || process.env.DB_USER || 'brightbuy_app',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'brightbuy',
  password: process.env.DB_APP_PASSWORD || process.env.DB_PASSWORD || 'brightbuy_app_pass',
  port: process.env.DB_PORT || 5432,
});

pool.on('error', (err, _client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool;
