const db = require('../config/db');

const PERIODS = { daily: 'day', weekly: 'week', monthly: 'month', quarterly: 'quarter' };
const REVENUE_STATUSES = ['paid', 'shipped', 'delivered'];

function getPeriod(period) {
  const name = period || 'monthly';
  if (!PERIODS[name]) { const error = new Error('period must be one of: daily, weekly, monthly, quarterly'); error.status = 400; throw error; }
  return { name, trunc: PERIODS[name] };
}

function key(date, name) {
  const iso = date.toISOString();
  if (name === 'daily') return iso.slice(0, 10);
  if (name === 'weekly') return iso.slice(0, 10);
  if (name === 'quarterly') return `${iso.slice(0, 4)}-Q${Math.floor(Number(iso.slice(5, 7)) - 1) / 3 + 1}`;
  return iso.slice(0, 7);
}

function filters(startDate, endDate, values) {
  const result = [`o.status = ANY($${values.length + 1}::varchar[])`]; values.push(REVENUE_STATUSES);
  if (startDate) { values.push(startDate); result.push(`o.order_date >= $${values.length}::date`); }
  if (endDate) { values.push(endDate); result.push(`o.order_date < ($${values.length}::date + INTERVAL '1 day')`); }
  return result;
}

async function revenue({ period, startDate, endDate }) {
  const config = getPeriod(period); const values = []; const where = filters(startDate, endDate, values);
  const result = await db.query(`SELECT date_trunc('${config.trunc}', o.order_date) AS period, COALESCE(SUM(o.total_amount), 0)::numeric(12,2) AS revenue, COUNT(*)::int AS order_count FROM orders o WHERE ${where.join(' AND ')} GROUP BY 1 ORDER BY 1`, values);
  return result.rows.map(row => ({ period: key(row.period, config.name), revenue: Number(row.revenue), order_count: Number(row.order_count) }));
}

async function topProducts({ limit, sortBy, startDate, endDate }) {
  const values = []; const where = filters(startDate, endDate, values); values.push(limit);
  const orderBy = sortBy === 'quantity' ? 'total_quantity DESC' : 'total_revenue DESC';
  const result = await db.query(`SELECT p.product_id, p.product_name, v.variant_name, SUM(oi.quantity)::int AS total_quantity, SUM(oi.quantity * oi.unit_price)::numeric(12,2) AS total_revenue FROM orders o JOIN order_items oi ON oi.order_id=o.order_id JOIN product_variants v ON v.variant_id=oi.variant_id JOIN products p ON p.product_id=v.product_id WHERE ${where.join(' AND ')} GROUP BY p.product_id, p.product_name, v.variant_id, v.variant_name ORDER BY ${orderBy}, p.product_name LIMIT $${values.length}`, values);
  return result.rows.map(row => ({ ...row, total_quantity: Number(row.total_quantity), total_revenue: Number(row.total_revenue) }));
}

async function orders({ period, startDate, endDate }) {
  const config = getPeriod(period); const values = []; const where = filters(startDate, endDate, values);
  const result = await db.query(`SELECT date_trunc('${config.trunc}', o.order_date) AS period, o.status, COUNT(*)::int AS order_count FROM orders o WHERE ${where.join(' AND ')} GROUP BY 1, o.status ORDER BY 1, o.status`, values);
  return result.rows.map(row => ({ period: key(row.period, config.name), status: row.status, order_count: Number(row.order_count) }));
}

module.exports = { revenue, topProducts, orders };
