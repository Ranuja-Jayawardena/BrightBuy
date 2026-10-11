const db = require('../config/db');

const createSession = async (req, res) => {
    try {
        const customer_id = req.user.customer_id;
        const { order_id, payment_method } = req.body;

        if (!order_id) {
            return res.status(400).json({ error: 'order_id is required' });
        }
        if (!['card', 'cod'].includes(payment_method)) {
            return res.status(400).json({ error: 'Invalid payment_method. Must be card or cod' });
        }

        // Check if order exists and belongs to the customer
        const orderResult = await db.query(
            'SELECT order_id, status, total_amount FROM orders WHERE order_id = $1 AND customer_id = $2',
            [order_id, customer_id]
        );

        if (orderResult.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const order = orderResult.rows[0];

        if (order.status !== 'pending') {
            return res.status(400).json({ error: 'Order already paid' });
        }

        if (payment_method === 'cod') {
            const insertResult = await db.query(
                `INSERT INTO payments (order_id, payment_method, payment_status, amount)
                 VALUES ($1, $2, $3, $4) RETURNING payment_id`,
                [order_id, 'cod', 'cod_pending', order.total_amount]
            );

            return res.status(200).json({
                message: 'COD order confirmed',
                payment_id: insertResult.rows[0].payment_id
            });
        } else if (payment_method === 'card') {
            let checkout_url = 'https://checkout.lemonsqueezy.com/test-url'; // Fallback for testing without env vars

            if (process.env.LEMON_SQUEEZY_API_KEY && process.env.LEMON_SQUEEZY_STORE_ID && process.env.LEMON_SQUEEZY_VARIANT_ID) {
                const lsResponse = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/vnd.api+json',
                        'Content-Type': 'application/vnd.api+json',
                        'Authorization': `Bearer ${process.env.LEMON_SQUEEZY_API_KEY}`
                    },
                    body: JSON.stringify({
                        data: {
                            type: "checkouts",
                            attributes: {
                                checkout_data: {
                                    custom: {
                                        order_id: order_id.toString()
                                    }
                                }
                            },
                            relationships: {
                                store: {
                                    data: {
                                        type: "stores",
                                        id: process.env.LEMON_SQUEEZY_STORE_ID
                                    }
                                },
                                variant: {
                                    data: {
                                        type: "variants",
                                        id: process.env.LEMON_SQUEEZY_VARIANT_ID
                                    }
                                }
                            }
                        }
                    })
                });

                const lsResult = await lsResponse.json();
                if (lsResponse.ok && lsResult.data && lsResult.data.attributes) {
                    checkout_url = lsResult.data.attributes.url;
                } else {
                    console.error('Lemon Squeezy API Error:', lsResult);
                    return res.status(500).json({ error: 'Failed to create payment session with Lemon Squeezy' });
                }
            }

            const insertResult = await db.query(
                `INSERT INTO payments (order_id, payment_method, payment_status, amount)
                 VALUES ($1, $2, $3, $4) RETURNING payment_id`,
                [order_id, 'card', 'pending', order.total_amount]
            );

            return res.status(200).json({
                checkout_url,
                payment_id: insertResult.rows[0].payment_id
            });
        }
    } catch (error) {
        console.error('Error creating payment session:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    createSession
};
