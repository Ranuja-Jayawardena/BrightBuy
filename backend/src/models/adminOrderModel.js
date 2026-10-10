const db = require('../config/db');

function mapOrder(row) {
  return { ...row, total_amount: Number(row.total_amount), item_count: Number(row.item_count || 0) };
}

async function findOrders({ page, limit, status, dateFrom, dateTo, customer }) {
  const values = [];
  const where = [];
  const add = (value, expression) => { values.push(value); where.push(expression.replace('?', `$${values.length}`)); };
  if (status) add(status, 'o.status = ?');
  if (dateFrom) add(dateFrom, 'o.order_date >= ?::date');
  if (dateTo) add(dateTo, 'o.order_date < (?::date + INTERVAL \'1 day\')');
  if (customer) {
    values.push(`%${customer}%`);
    where.push(`(u.email ILIKE $${values.length} OR c.first_name ILIKE $${values.length} OR c.last_name ILIKE $${values.length} OR CAST(c.customer_id AS TEXT) = $${values.length})`);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const count = await db.query(`SELECT COUNT(*)::int AS total FROM orders o JOIN customers c ON c.customer_id=o.customer_id JOIN users u ON u.user_id=c.user_id ${clause}`, values);
  const offset = (page - 1) * limit;
  const dataValues = [...values, limit, offset];
  const result = await db.query(`
    SELECT o.order_id, o.order_date, o.status, o.total_amount, c.customer_id,
      c.first_name, c.last_name, u.email, COUNT(oi.order_item_id)::int AS item_count
    FROM orders o JOIN customers c ON c.customer_id=o.customer_id JOIN users u ON u.user_id=c.user_id
    LEFT JOIN order_items oi ON oi.order_id=o.order_id ${clause}
    GROUP BY o.order_id, c.customer_id, c.first_name, c.last_name, u.email
    ORDER BY o.order_date DESC LIMIT $${dataValues.length - 1} OFFSET $${dataValues.length}`, dataValues);
  return { rows: result.rows.map(mapOrder), total: count.rows[0].total };
}

async function findOrderById(orderId) {
  const order = await db.query(`SELECT o.order_id,o.order_date,o.status,o.total_amount,c.customer_id,c.first_name,c.last_name,u.email
    FROM orders o JOIN customers c ON c.customer_id=o.customer_id JOIN users u ON u.user_id=c.user_id WHERE o.order_id=$1`, [orderId]);
  if (!order.rowCount) return null;
  const [items, payment, delivery] = await Promise.all([
    db.query(`SELECT oi.order_item_id,oi.variant_id,oi.quantity,oi.unit_price,v.variant_name,p.product_name FROM order_items oi JOIN product_variants v ON v.variant_id=oi.variant_id JOIN products p ON p.product_id=v.product_id WHERE oi.order_id=$1`, [orderId]),
    db.query('SELECT payment_id,payment_method,payment_status,amount,transaction_id,payment_date FROM payments WHERE order_id=$1', [orderId]),
    db.query('SELECT d.*,c.city_name FROM deliveries d JOIN cities c ON c.city_id=d.delivery_city_id WHERE d.order_id=$1', [orderId]),
  ]);
  return { ...order.rows[0], total_amount: Number(order.rows[0].total_amount), items: items.rows.map(i => ({ ...i, unit_price: Number(i.unit_price) })), payment: payment.rows[0] || null, delivery: delivery.rows[0] || null };
}

async function updateOrderStatus(orderId, status) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const current = await client.query('SELECT order_id,status FROM orders WHERE order_id=$1 FOR UPDATE', [orderId]);
    if (!current.rowCount) { await client.query('ROLLBACK'); return null; }
    const updated = await client.query('UPDATE orders SET status=$2,updated_at=CURRENT_TIMESTAMP WHERE order_id=$1 RETURNING order_id,status,updated_at', [orderId, status]);
    if (status === 'cancelled' && current.rows[0].status !== 'cancelled') {
      await client.query(`UPDATE product_variants v SET stock_quantity=v.stock_quantity+oi.quantity,updated_at=CURRENT_TIMESTAMP FROM order_items oi WHERE oi.order_id=$1 AND oi.variant_id=v.variant_id`, [orderId]);
    }
    await client.query('COMMIT');
    return updated.rows[0];
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}

async function updateDeliveryStatus(deliveryId, deliveryStatus, trackingNumber) {
  const result = await db.query(`UPDATE deliveries SET delivery_status=$2,tracking_number=COALESCE($3,tracking_number),updated_at=CURRENT_TIMESTAMP WHERE delivery_id=$1 RETURNING delivery_id,order_id,delivery_status,tracking_number`, [deliveryId, deliveryStatus, trackingNumber]);
  return result.rows[0] || null;
}

module.exports = { findOrders, findOrderById, updateOrderStatus, updateDeliveryStatus };
