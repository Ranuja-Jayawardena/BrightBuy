const db = require('../config/db');

const REVENUE_STATUSES = ['paid', 'shipped', 'delivered'];

function revenueFilters(startDate, endDate, values) {
  const where = [`o.status = ANY($${values.length + 1}::varchar[])`];
  values.push(REVENUE_STATUSES);
  if (startDate) {
    values.push(startDate);
    where.push(`o.order_date >= $${values.length}::date`);
  }
  if (endDate) {
    values.push(endDate);
    where.push(`o.order_date < ($${values.length}::date + INTERVAL '1 day')`);
  }
  return where;
}

async function lowStock(threshold) {
  const result = await db.query(`
    SELECT v.variant_id, v.variant_sku, p.product_name, v.variant_name,
      v.stock_quantity, v.price
    FROM product_variants v
      JOIN products p ON p.product_id = v.product_id
    WHERE v.stock_quantity < $1 AND v.is_active = true AND p.is_active = true
    ORDER BY v.stock_quantity, p.product_name, v.variant_name`, [threshold]);
  return result.rows.map(row => ({ ...row, stock_quantity: Number(row.stock_quantity), price: Number(row.price) }));
}

async function inventorySummary() {
  const result = await db.query(`
    SELECT c.category_id, c.category_name,
      COALESCE(SUM(v.stock_quantity), 0)::int AS total_units,
      COALESCE(SUM(v.stock_quantity * v.price), 0)::numeric(12,2) AS total_value
    FROM categories c
      LEFT JOIN product_categories pc ON pc.category_id = c.category_id
      LEFT JOIN products p ON p.product_id = pc.product_id AND p.is_active = true
      LEFT JOIN product_variants v ON v.product_id = p.product_id AND v.is_active = true
    WHERE c.is_active = true
    GROUP BY c.category_id, c.category_name
    ORDER BY c.category_name`);
  return result.rows.map(row => ({ ...row, total_units: Number(row.total_units), total_value: Number(row.total_value) }));
}

async function topCustomers({ limit, sortBy, startDate, endDate }) {
  const values = [];
  const where = revenueFilters(startDate, endDate, values);
  values.push(limit);
  const orderBy = sortBy === 'orders' ? 'order_count DESC' : 'total_spend DESC';
  const result = await db.query(`
    SELECT c.customer_id, c.first_name, c.last_name, u.email,
      COUNT(o.order_id)::int AS order_count,
      COALESCE(SUM(o.total_amount), 0)::numeric(12,2) AS total_spend
    FROM customers c
      JOIN users u ON u.user_id = c.user_id
      JOIN orders o ON o.customer_id = c.customer_id
    WHERE ${where.join(' AND ')}
    GROUP BY c.customer_id, c.first_name, c.last_name, u.email
    ORDER BY ${orderBy}, c.customer_id
    LIMIT $${values.length}`, values);
  return result.rows.map(row => ({ ...row, order_count: Number(row.order_count), total_spend: Number(row.total_spend) }));
}

async function customerGeography({ startDate, endDate }) {
  const values = [];
  const where = revenueFilters(startDate, endDate, values);
  const result = await db.query(`
    SELECT ci.city_name, ci.is_main_city, COUNT(o.order_id)::int AS order_count,
      COALESCE(SUM(o.total_amount), 0)::numeric(12,2) AS revenue
    FROM orders o
      JOIN deliveries d ON d.order_id = o.order_id
      JOIN cities ci ON ci.city_id = d.delivery_city_id
    WHERE ${where.join(' AND ')}
    GROUP BY ci.city_id, ci.city_name, ci.is_main_city
    ORDER BY ci.is_main_city DESC, ci.city_name`, values);
  return result.rows.map(row => ({ ...row, order_count: Number(row.order_count), revenue: Number(row.revenue) }));
}

module.exports = { lowStock, inventorySummary, topCustomers, customerGeography };
