const crypto = require('crypto');
const orderModel = require('../models/orderModel');
const notificationService = require('../services/notificationService');

function isPositiveInt(value) {
    if (value === undefined || value === null) return false;
    const str = String(value).trim();
    if (!/^\d+$/.test(str)) return false;
    const num = Number(str);
    return Number.isSafeInteger(num) && num > 0;
}

const createOrder = async (req, res) => {
    try {
        const customer_id = req.user ? req.user.customer_id : null;
        if (!customer_id) {
            return res.status(403).json({ error: 'forbidden', message: 'Only customers can place orders', statusCode: 403 });
        }

        const { address_id, delivery_mode } = req.body || {};

        if (!delivery_mode || !['home_delivery', 'store_pickup'].includes(delivery_mode)) {
            return res.status(400).json({ error: 'invalid_request', message: 'Valid delivery_mode is required (home_delivery or store_pickup)', statusCode: 400 });
        }

        if (delivery_mode === 'home_delivery') {
            if (!isPositiveInt(address_id)) {
                return res.status(400).json({ error: 'invalid_request', message: 'address_id must be a positive integer', statusCode: 400 });
            }
        } else if (address_id !== undefined && address_id !== null && !isPositiveInt(address_id)) {
            return res.status(400).json({ error: 'invalid_request', message: 'address_id must be a positive integer if provided', statusCode: 400 });
        }

        const aid = isPositiveInt(address_id) ? Number(address_id) : null;

        // D3 Request Identity Contract (X-Idempotency-Key)
        let idempotencyKey = null;
        let requestHash = null;
        const rawKey = req.headers['x-idempotency-key'];

        if (rawKey !== undefined) {
            const trimmedKey = String(rawKey).trim();
            if (!trimmedKey || trimmedKey.length > 255) {
                return res.status(400).json({
                    error: 'invalid_request',
                    message: 'X-Idempotency-Key must be a non-empty string up to 255 characters',
                    statusCode: 400
                });
            }
            idempotencyKey = trimmedKey;
            const normalizedPayload = JSON.stringify({
                customer_id,
                address_id: aid,
                delivery_mode
            });
            requestHash = crypto.createHash('sha256').update(normalizedPayload).digest('hex');
        }

        const result = idempotencyKey
            ? await orderModel.createOrder(customer_id, aid, delivery_mode, idempotencyKey, requestHash)
            : await orderModel.createOrder(customer_id, aid, delivery_mode);

        // Replay handling: return original order payload with HTTP 200, no duplicate email trigger
        if (result && result.is_replay) {
            const replayOrder = { ...result };
            delete replayOrder.is_replay;
            res.setHeader('X-Idempotency-Replayed', 'true');
            return res.status(200).json({
                message: 'Order retrieved (idempotent replay)',
                order: replayOrder,
                is_replay: true
            });
        }

        // Trigger Order Confirmation Email ONLY for newly created orders, NEVER on replay!
        if (result && result.order_id) {
            notificationService.sendOrderConfirmation(result.order_id).catch(err =>
                console.error('[Order] Failed to send order confirmation email:', err)
            );
        }

        const finalOrder = { ...result };
        delete finalOrder.is_replay;

        res.status(201).json({
            message: 'Order placed successfully',
            order: finalOrder
        });
    } catch (error) {
        if (error.code === 'IDEMPOTENCY_CONFLICT') {
            return res.status(409).json({ error: 'conflict', message: error.message, statusCode: 409 });
        }
        if (error.code === '23505') {
            if (error.constraint === 'uq_order_idempotency_customer_key') {
                return res.status(409).json({ error: 'conflict', message: 'Concurrent request with same idempotency key in progress', statusCode: 409 });
            }
            if (error.constraint === 'idx_deliveries_order_id_unique') {
                return res.status(409).json({ error: 'conflict', message: 'Delivery already exists for this order', statusCode: 409 });
            }
            if (error.constraint === 'idx_payments_order_id_unique') {
                return res.status(409).json({ error: 'conflict', message: 'Payment already exists for this order', statusCode: 409 });
            }
            return res.status(409).json({ error: 'conflict', message: 'Resource conflict occurred', statusCode: 409 });
        }
        if (error.code === '23514') {
            if (error.constraint === 'chk_deliveries_mode_status') {
                return res.status(400).json({ error: 'invalid_delivery_status', message: 'Invalid delivery status for delivery mode', statusCode: 400 });
            }
            if (error.constraint === 'chk_order_items_unit_price_nonnegative' || error.constraint === 'chk_payments_amount_nonnegative') {
                return res.status(400).json({ error: 'invalid_amount', message: 'Negative amounts or prices are not allowed', statusCode: 400 });
            }
            return res.status(400).json({ error: 'constraint_violation', message: 'Database check constraint violation', statusCode: 400 });
        }
        if (error.message && error.message.startsWith('Cart is empty')) {
            return res.status(400).json({ error: 'cart_empty', message: error.message, statusCode: 400 });
        }
        if (error.message && error.message.startsWith('Insufficient stock for:')) {
            return res.status(400).json({ error: 'insufficient_stock', message: error.message, statusCode: 400 });
        }
        if (error.message === 'Address not found or does not belong to customer') {
            return res.status(400).json({ error: 'invalid_address', message: error.message, statusCode: 400 });
        }
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'internal_error', message: 'Internal Server Error', statusCode: 500 });
    }
};

const getOrders = async (req, res) => {
    try {
        const customer_id = req.user ? req.user.customer_id : null;
        if (!customer_id) {
            return res.status(403).json({ error: 'forbidden', message: 'Only customers can view orders', statusCode: 403 });
        }

        const orders = await orderModel.getOrders(customer_id);
        res.json({ orders });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'internal_error', message: 'Internal Server Error', statusCode: 500 });
    }
};

const getOrderById = async (req, res) => {
    try {
        const customer_id = req.user ? req.user.customer_id : null;
        if (!customer_id) {
            return res.status(403).json({ error: 'forbidden', message: 'Only customers can view orders', statusCode: 403 });
        }

        if (!isPositiveInt(req.params.id)) {
            return res.status(400).json({ error: 'invalid_request', message: 'id must be a positive integer', statusCode: 400 });
        }
        const order_id = Number(req.params.id);

        const order = await orderModel.getOrderById(order_id, customer_id);
        if (!order) {
            return res.status(404).json({ error: 'not_found', message: 'Order not found', statusCode: 404 });
        }

        res.json({ order });
    } catch (error) {
        console.error('Error fetching order detail:', error);
        res.status(500).json({ error: 'internal_error', message: 'Internal Server Error', statusCode: 500 });
    }
};

module.exports = {
    createOrder,
    getOrders,
    getOrderById
};
