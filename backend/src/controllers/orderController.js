const orderModel = require('../models/orderModel');

const createOrder = async (req, res) => {
    try {
        const customer_id = req.user.customer_id;
        const { address_id, delivery_mode } = req.body;

        if (!address_id) {
            return res.status(400).json({ error: 'address_id is required' });
        }
        if (!delivery_mode || !['home_delivery', 'store_pickup'].includes(delivery_mode)) {
            return res.status(400).json({ error: 'Valid delivery_mode is required (home_delivery or store_pickup)' });
        }

        const order = await orderModel.createOrder(customer_id, address_id, delivery_mode);
        res.status(201).json({
            message: 'Order placed successfully',
            order
        });
    } catch (error) {
        if (error.message.startsWith('Cart is empty') || error.message.startsWith('Insufficient stock for:')) {
            return res.status(400).json({ error: error.message });
        }
        if (error.message === 'Address not found or does not belong to customer') {
            return res.status(400).json({ error: error.message });
        }
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getOrders = async (req, res) => {
    try {
        const customer_id = req.user.customer_id;
        const orders = await orderModel.getOrders(customer_id);
        res.json({ orders });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getOrderById = async (req, res) => {
    try {
        const customer_id = req.user.customer_id;
        const order_id = parseInt(req.params.id);

        if (isNaN(order_id)) {
            return res.status(400).json({ error: 'Invalid order ID' });
        }

        const order = await orderModel.getOrderById(order_id, customer_id);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json({ order });
    } catch (error) {
        console.error('Error fetching order detail:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    createOrder,
    getOrders,
    getOrderById
};
