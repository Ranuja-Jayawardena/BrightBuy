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
        const order = await orderModel.createOrder(customer_id, aid, delivery_mode);

        // Trigger Order Confirmation Email (Phase 8.2 - non-blocking after DB commit)
        notificationService.sendOrderConfirmation(order.order_id).catch(err =>
            console.error('[Order] Failed to send order confirmation email:', err)
        );
        res.status(201).json({
            message: 'Order placed successfully',
            order
        });
    } catch (error) {
        if (error.message.startsWith('Cart is empty')) {
            return res.status(400).json({ error: 'cart_empty', message: error.message, statusCode: 400 });
        }
        if (error.message.startsWith('Insufficient stock for:')) {
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
