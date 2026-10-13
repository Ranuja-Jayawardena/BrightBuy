const db = require('../config/db');
const { enqueueEmail } = require('./emailQueue');
const {
  welcomeEmail,
  orderConfirmationEmail,
  paymentConfirmationEmail,
  deliveryStatusUpdateEmail,
} = require('../templates/emailTemplates');

/**
 * Send a welcome email to a newly registered user.
 *
 * @param {Object} params
 * @param {string} params.email
 * @param {string} [params.firstName]
 * @param {string} [params.lastName]
 */
async function sendWelcome({ email, firstName, lastName }) {
  try {
    if (!email) {
      console.warn('[NotificationService] sendWelcome skipped: missing email');
      return { success: false, error: 'Missing email' };
    }

    const name = [firstName, lastName].filter(Boolean).join(' ') || undefined;
    const { subject, html, text } = welcomeEmail({ name, email });
    return await enqueueEmail(email, subject, html, text, `welcome:${email}`);
  } catch (error) {
    console.error('[NotificationService] sendWelcome failed:', error.message || error);
    return { success: false, error: error.message || String(error) };
  }
}

/**
 * Send an order confirmation email.
 * Accepts either an order ID or an object containing order details.
 *
 * @param {number|string|Object} orderIdOrData
 */
async function sendOrderConfirmation(orderIdOrData) {
  try {
    let orderId;
    let customerEmail;
    let customerName;
    let orderDate;
    let totalAmount;
    let items = [];
    let deliveryAddress;
    let estimatedDeliveryDays;

    if (typeof orderIdOrData === 'object' && orderIdOrData !== null) {
      orderId = orderIdOrData.order_id || orderIdOrData.orderId;
      customerEmail = orderIdOrData.email || orderIdOrData.customerEmail;
      customerName = orderIdOrData.customerName || orderIdOrData.name;
      orderDate = orderIdOrData.order_date || orderIdOrData.orderDate;
      totalAmount = orderIdOrData.total_amount || orderIdOrData.totalAmount;
      items = orderIdOrData.items || [];
      deliveryAddress = orderIdOrData.deliveryAddress || orderIdOrData.delivery;
      estimatedDeliveryDays = orderIdOrData.estimatedDeliveryDays || (deliveryAddress && deliveryAddress.estimated_delivery_days);
    } else {
      orderId = Number(orderIdOrData);
    }

    // Query DB if we need missing customer details or items
    if (orderId && (!customerEmail || items.length === 0)) {
      const orderRes = await db.query(`
        SELECT o.order_id, o.order_date, o.status, o.total_amount,
               u.email, c.first_name, c.last_name,
               d.delivery_mode, d.delivery_address_line1, d.delivery_address_line2,
               d.delivery_zip_code, d.estimated_delivery_days, ct.city_name
        FROM orders o
        JOIN customers c ON c.customer_id = o.customer_id
        JOIN users u ON u.user_id = c.user_id
        LEFT JOIN deliveries d ON d.order_id = o.order_id
        LEFT JOIN cities ct ON ct.city_id = d.delivery_city_id
        WHERE o.order_id = $1
      `, [orderId]);

      if (orderRes.rows.length === 0) {
        console.warn(`[NotificationService] sendOrderConfirmation: order #${orderId} not found`);
        return { success: false, error: 'Order not found' };
      }

      const row = orderRes.rows[0];
      customerEmail = row.email;
      customerName = [row.first_name, row.last_name].filter(Boolean).join(' ') || undefined;
      orderDate = row.order_date;
      totalAmount = row.total_amount;
      estimatedDeliveryDays = row.estimated_delivery_days;
      deliveryAddress = {
        address_line1: row.delivery_address_line1,
        address_line2: row.delivery_address_line2,
        city_name: row.city_name,
        zip_code: row.delivery_zip_code,
      };

      const itemsRes = await db.query(`
        SELECT oi.order_item_id, oi.variant_id, oi.quantity, oi.unit_price,
               v.variant_name, p.product_name
        FROM order_items oi
        JOIN product_variants v ON v.variant_id = oi.variant_id
        JOIN products p ON p.product_id = v.product_id
        WHERE oi.order_id = $1
      `, [orderId]);

      items = itemsRes.rows.map(i => ({
        product_name: i.product_name,
        variant_name: i.variant_name,
        quantity: i.quantity,
        unit_price: i.unit_price,
      }));
    }

    if (!customerEmail) {
      console.warn(`[NotificationService] sendOrderConfirmation: no email for order #${orderId}`);
      return { success: false, error: 'Missing customer email' };
    }

    const { subject, html, text } = orderConfirmationEmail({
      name: customerName,
      orderId,
      orderDate,
      items,
      totalAmount,
      deliveryAddress,
      estimatedDeliveryDays,
    });

    return await enqueueEmail(customerEmail, subject, html, text, `order:${orderId}`);
  } catch (error) {
    console.error('[NotificationService] sendOrderConfirmation failed:', error.message || error);
    return { success: false, error: error.message || String(error) };
  }
}

/**
 * Send a payment confirmation email.
 *
 * @param {Object} params
 * @param {number|string} params.order_id
 * @param {number|string} [params.orderId]
 * @param {string} [params.transaction_id]
 * @param {string} [params.transactionId]
 * @param {number} [params.amount]
 * @param {string} [params.payment_method]
 * @param {string} [params.paymentMethod]
 * @param {string} [params.customerEmail]
 * @param {string} [params.customerName]
 */
async function sendPaymentConfirmation(params = {}) {
  try {
    const orderId = Number(params.order_id || params.orderId);
    let transactionId = params.transaction_id || params.transactionId;
    let amount = params.amount;
    let paymentMethod = params.payment_method || params.paymentMethod;
    let customerEmail = params.customerEmail;
    let customerName = params.customerName;
    let paymentDate = params.paymentDate;

    if (orderId && (!customerEmail || !amount || !paymentMethod)) {
      const paymentRes = await db.query(`
        SELECT o.order_id, o.total_amount, u.email, c.first_name, c.last_name,
               p.payment_method, p.amount, p.transaction_id, p.payment_date
        FROM orders o
        JOIN customers c ON c.customer_id = o.customer_id
        JOIN users u ON u.user_id = c.user_id
        LEFT JOIN payments p ON p.order_id = o.order_id
        WHERE o.order_id = $1
      `, [orderId]);

      if (paymentRes.rows.length > 0) {
        const row = paymentRes.rows[0];
        customerEmail = customerEmail || row.email;
        customerName = customerName || [row.first_name, row.last_name].filter(Boolean).join(' ') || undefined;
        amount = amount || row.amount || row.total_amount;
        paymentMethod = paymentMethod || row.payment_method || 'Online Payment';
        transactionId = transactionId || row.transaction_id || 'N/A';
        paymentDate = paymentDate || row.payment_date || new Date();
      }
    }

    if (!customerEmail) {
      console.warn(`[NotificationService] sendPaymentConfirmation: no customer email found for order #${orderId}`);
      return { success: false, error: 'Missing customer email' };
    }

    const { subject, html, text } = paymentConfirmationEmail({
      name: customerName,
      orderId,
      amount,
      paymentMethod,
      transactionId,
      paymentDate,
    });

    return await enqueueEmail(customerEmail, subject, html, text, `payment:${orderId}`);
  } catch (error) {
    console.error('[NotificationService] sendPaymentConfirmation failed:', error.message || error);
    return { success: false, error: error.message || String(error) };
  }
}

/**
 * Send a delivery status update email.
 * Accepts either a delivery object (e.g. from updateDeliveryStatus) or a delivery_id/order_id.
 *
 * @param {number|string|Object} deliveryOrId
 */
async function sendDeliveryStatusUpdate(deliveryOrId) {
  try {
    let deliveryId;
    let orderId;
    let deliveryStatus;
    let trackingNumber;

    if (typeof deliveryOrId === 'object' && deliveryOrId !== null) {
      deliveryId = deliveryOrId.delivery_id;
      orderId = deliveryOrId.order_id;
      deliveryStatus = deliveryOrId.delivery_status;
      trackingNumber = deliveryOrId.tracking_number;
    } else {
      deliveryId = Number(deliveryOrId);
    }

    const deliveryRes = await db.query(`
      SELECT d.delivery_id, d.order_id, d.delivery_status, d.tracking_number, d.estimated_delivery_days, d.updated_at,
             u.email, c.first_name, c.last_name
      FROM deliveries d
      JOIN orders o ON o.order_id = d.order_id
      JOIN customers c ON c.customer_id = o.customer_id
      JOIN users u ON u.user_id = c.user_id
      WHERE d.delivery_id = $1 OR d.order_id = $2
      LIMIT 1
    `, [deliveryId || null, orderId || null]);

    if (deliveryRes.rows.length === 0) {
      console.warn(`[NotificationService] sendDeliveryStatusUpdate: delivery not found (ID: ${deliveryId}, Order: ${orderId})`);
      return { success: false, error: 'Delivery not found' };
    }

    const row = deliveryRes.rows[0];
    const email = row.email;
    const name = [row.first_name, row.last_name].filter(Boolean).join(' ') || undefined;

    const { subject, html, text } = deliveryStatusUpdateEmail({
      name,
      orderId: row.order_id,
      deliveryId: row.delivery_id,
      deliveryStatus: deliveryStatus || row.delivery_status,
      trackingNumber: trackingNumber || row.tracking_number,
      estimatedDeliveryDays: row.estimated_delivery_days,
    });

    return await enqueueEmail(email, subject, html, text, `delivery:${row.delivery_id}:${row.delivery_status}:${row.updated_at || ''}`);
  } catch (error) {
    console.error('[NotificationService] sendDeliveryStatusUpdate failed:', error.message || error);
    return { success: false, error: error.message || String(error) };
  }
}

/**
 * Extension hook point called by adminOrderService on delivery status changes.
 */
async function onDeliveryStatusChanged(delivery) {
  try {
    await sendDeliveryStatusUpdate(delivery);
  } catch (err) {
    console.error('[NotificationService] onDeliveryStatusChanged failed:', err.message);
  }
  return delivery;
}

module.exports = {
  sendWelcome,
  sendOrderConfirmation,
  sendPaymentConfirmation,
  sendDeliveryStatusUpdate,
  onDeliveryStatusChanged,
};
