const model = require('../models/adminOrderModel');
const notificationService = require('./notificationService');
const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];
const DELIVERY_STATUSES = ['pending', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];
function error(status, message) { const e = new Error(message); e.status = status; return e; }
function id(value, name) { const n = Number(value); if (!Number.isInteger(n) || n <= 0) throw error(400, `${name} must be a positive integer`); return n; }
async function list(query) {
  const page = Math.max(1, Number(query.page) || 1); const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  if (query.status && !ORDER_STATUSES.includes(query.status)) throw error(400, 'Invalid order status');
  const result = await model.findOrders({ page, limit, status: query.status, dateFrom: query.date_from, dateTo: query.date_to, customer: query.customer });
  return { orders: result.rows, pagination: { page, limit, total_count: Number(result.total), total_pages: Math.ceil(Number(result.total) / limit) || 1 } };
}
async function detail(orderId) { return model.findOrderById(id(orderId, 'id')); }
async function updateStatus(orderId, status) {
  const valid = status && ORDER_STATUSES.includes(status); if (!valid) throw error(400, 'Invalid status');
  const current = await model.findOrderById(id(orderId, 'id')); if (!current) return null;
  const allowed = current.status === 'pending' ? ['paid', 'cancelled'] : current.status === 'paid' ? ['shipped', 'cancelled'] : current.status === 'shipped' ? ['delivered', 'cancelled'] : [];
  if (!allowed.includes(status)) throw error(400, 'Invalid status transition');
  return model.updateOrderStatus(orderId, status);
}
async function updateDelivery(deliveryId, body) {
  const delivery_status = body.delivery_status; if (!DELIVERY_STATUSES.includes(delivery_status)) throw error(400, 'Invalid delivery status');
  const result = await model.updateDeliveryStatus(id(deliveryId, 'id'), delivery_status, body.tracking_number);
  if (result) await notificationService.onDeliveryStatusChanged(result);
  return result;
}
module.exports = { list, detail, updateStatus, updateDelivery };
