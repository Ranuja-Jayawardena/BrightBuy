const db = require('../config/db');

function mapOrder(row) {
  return {
    ...row,
    total_amount: Number(row.total_amount),
    item_count: Number(row.item_count || 0),
    delivery_mode: row.delivery_mode || null
  };
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
      c.first_name, c.last_name, u.email, d.delivery_mode, COUNT(oi.order_item_id)::int AS item_count
    FROM orders o JOIN customers c ON c.customer_id=o.customer_id JOIN users u ON u.user_id=c.user_id
    LEFT JOIN deliveries d ON d.order_id=o.order_id
    LEFT JOIN order_items oi ON oi.order_id=o.order_id ${clause}
    GROUP BY o.order_id, c.customer_id, c.first_name, c.last_name, u.email, d.delivery_mode
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
  const deliveryData = delivery.rows[0] || null;
  return {
    ...order.rows[0],
    delivery_mode: deliveryData ? deliveryData.delivery_mode : null,
    total_amount: Number(order.rows[0].total_amount),
    items: items.rows.map(i => ({ ...i, unit_price: Number(i.unit_price) })),
    payment: payment.rows[0] || null,
    delivery: deliveryData
  };
}

async function findDeliveryById(deliveryId) {
  const result = await db.query('SELECT * FROM deliveries WHERE delivery_id = $1', [deliveryId]);
  return result.rows[0] || null;
}

async function updateOrderStatus(orderId, status) {
  const client = typeof db.connect === 'function' ? await db.connect() : null;
  const runner = client || db;
  try {
    if (client) await client.query('BEGIN');
    const current = await runner.query('SELECT order_id, status FROM orders WHERE order_id = $1 FOR UPDATE', [orderId]);
    if (!current.rowCount) {
      if (client) await client.query('ROLLBACK');
      return null;
    }
    const currentStatus = current.rows[0].status;

    // Handle unchanged status deliberately as a clean no-op
    if (currentStatus === status) {
      if (client) await client.query('COMMIT');
      return current.rows[0];
    }

    // Validate state machine inside transaction lock
    const allowed = {
      pending: ['paid', 'shipped', 'cancelled'],
      paid: ['shipped', 'cancelled'],
      shipped: ['delivered', 'cancelled'],
      delivered: [],
      cancelled: []
    };

    if (!allowed[currentStatus] || !allowed[currentStatus].includes(status)) {
      const err = new Error(`Invalid status transition from ${currentStatus} to ${status}`);
      err.status = 400;
      err.code = 'INVALID_ORDER_TRANSITION';
      throw err;
    }

    // If transitioning to cancelled, restore stock once with aggregation and ascending variant locks
    if (status === 'cancelled' && currentStatus !== 'cancelled') {
      // 1. Lock affected variants in ascending order to prevent deadlocks
      const itemsRes = await runner.query(
        `SELECT DISTINCT variant_id FROM order_items WHERE order_id = $1 ORDER BY variant_id ASC`,
        [orderId]
      );
      if (itemsRes.rows.length > 0) {
        const variantIds = itemsRes.rows.map(r => r.variant_id);
        await runner.query(
          `SELECT variant_id FROM product_variants WHERE variant_id = ANY($1) ORDER BY variant_id ASC FOR UPDATE OF product_variants`,
          [variantIds]
        );
      }

      // 2. Aggregate quantity per variant to avoid duplicate line loss in UPDATE FROM
      await runner.query(
        `WITH item_sums AS (
           SELECT variant_id, SUM(quantity)::int AS qty
           FROM order_items
           WHERE order_id = $1
           GROUP BY variant_id
         )
         UPDATE product_variants v
         SET stock_quantity = v.stock_quantity + s.qty
         FROM item_sums s
         WHERE v.variant_id = s.variant_id`,
        [orderId]
      );
    }

    const updated = await runner.query(
      'UPDATE orders SET status = $2, updated_at = CURRENT_TIMESTAMP WHERE order_id = $1 RETURNING order_id, status, updated_at',
      [orderId, status]
    );

    if (client) await client.query('COMMIT');
    return updated.rows[0];
  } catch (error) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (_rollbackErr) { /* ignore rollback failure on disconnected client */ }
    }
    // Map trigger errors (P0001) to 400
    if (error.code === 'P0001' || error.message.includes('Invalid order status transition')) {
      const err = new Error(error.message);
      err.status = 400;
      err.code = 'INVALID_ORDER_TRANSITION';
      throw err;
    }
    throw error;
  } finally {
    if (client) client.release();
  }
}

async function updateDeliveryStatus(deliveryId, deliveryStatus, trackingNumber) {
  try {
    const result = await db.query(
      `UPDATE deliveries 
       SET delivery_status = $2,
           tracking_number = CASE WHEN $3::text IS NOT NULL THEN $3 ELSE tracking_number END,
           updated_at = CURRENT_TIMESTAMP 
       WHERE delivery_id = $1 AND (delivery_status IS DISTINCT FROM $2 OR ($3::text IS NOT NULL AND tracking_number IS DISTINCT FROM $3)) 
       RETURNING delivery_id, order_id, delivery_mode, delivery_status, tracking_number, updated_at`,
      [deliveryId, deliveryStatus, trackingNumber !== undefined ? trackingNumber : null]
    );
    return result.rows[0] || null;
  } catch (error) {
    if (error.constraint === 'chk_deliveries_mode_status') {
      const err = new Error('Invalid delivery status for the delivery mode');
      err.status = 400;
      err.code = 'INVALID_DELIVERY_STATUS';
      throw err;
    }
    if (error.constraint === 'idx_deliveries_order_id_unique') {
      const err = new Error('Delivery already exists for this order');
      err.status = 409;
      err.code = 'CONFLICT';
      throw err;
    }
    throw error;
  }
}

module.exports = { findOrders, findOrderById, findDeliveryById, updateOrderStatus, updateDeliveryStatus };
