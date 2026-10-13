const { URL } = require('node:url');
const db = require('../config/db');

function isPositiveInt(value) {
    if (value === undefined || value === null) return false;
    const str = String(value).trim();
    if (!/^\d+$/.test(str)) return false;
    const num = Number(str);
    return Number.isSafeInteger(num) && num > 0;
}

const createSession = async (req, res) => {
    try {
        const customer_id = req.user ? req.user.customer_id : null;
        if (!customer_id) {
            return res.status(403).json({ error: 'forbidden', message: 'Only customers can create payment sessions', statusCode: 403 });
        }

        const { order_id, payment_method } = req.body || {};

        if (!isPositiveInt(order_id)) {
            return res.status(400).json({ error: 'invalid_request', message: 'order_id must be a positive integer', statusCode: 400 });
        }
        if (!payment_method || !['card', 'cod'].includes(payment_method)) {
            return res.status(400).json({ error: 'invalid_request', message: 'Invalid payment_method. Must be card or cod', statusCode: 400 });
        }

        const oid = Number(order_id);

        // Check if order exists and belongs to the customer
        const orderResult = await db.query(
            'SELECT order_id, status, total_amount FROM orders WHERE order_id = $1 AND customer_id = $2',
            [oid, customer_id]
        );

        if (orderResult.rows.length === 0) {
            return res.status(404).json({ error: 'not_found', message: 'Order not found', statusCode: 404 });
        }

        const order = orderResult.rows[0];

        if (order.status !== 'pending') {
            return res.status(400).json({ error: 'invalid_order_status', message: 'Order is not pending payment', statusCode: 400 });
        }

        const upsertPayment = async (method, status) => {
            const existingPayment = await db.query(
                'SELECT payment_id FROM payments WHERE order_id = $1 ORDER BY payment_id DESC LIMIT 1',
                [oid]
            );
            if (existingPayment.rows.length > 0) {
                const pid = existingPayment.rows[0].payment_id;
                await db.query(
                    `UPDATE payments 
                     SET payment_method = $1, payment_status = $2, amount = $3, updated_at = NOW() 
                     WHERE payment_id = $4`,
                    [method, status, order.total_amount, pid]
                );
                return pid;
            } else {
                const insertResult = await db.query(
                    `INSERT INTO payments (order_id, payment_method, payment_status, amount)
                     VALUES ($1, $2, $3, $4) RETURNING payment_id`,
                    [oid, method, status, order.total_amount]
                );
                return insertResult.rows[0].payment_id;
            }
        };

        if (payment_method === 'cod') {
            const payment_id = await upsertPayment('cod', 'cod_pending');

            return res.status(200).json({
                message: 'COD order confirmed',
                payment_id
            });
        } else if (payment_method === 'card') {
            let checkout_url = 'https://checkout.lemonsqueezy.com/test-url'; // Fallback for testing without env vars

            if (process.env.LEMON_SQUEEZY_API_KEY && process.env.LEMON_SQUEEZY_STORE_ID && process.env.LEMON_SQUEEZY_VARIANT_ID) {
                // Fetch customer details to prefill Lemon Squeezy checkout if available
                let customerEmail = undefined;
                let customerName = undefined;
                try {
                    const userRes = await db.query(
                        'SELECT u.email, c.first_name, c.last_name FROM users u JOIN customers c ON c.user_id = u.user_id WHERE c.customer_id = $1',
                        [customer_id]
                    );
                    if (userRes.rows.length > 0) {
                        customerEmail = userRes.rows[0].email;
                        customerName = [userRes.rows[0].first_name, userRes.rows[0].last_name].filter(Boolean).join(' ') || undefined;
                    }
                } catch {
                    // Ignore customer lookup failure and proceed without prefill
                }

                const clientOrigin = req.get('origin') || req.get('referer');
                let frontendBaseUrl = 'http://localhost:3000';
                const configuredOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
                    .split(',')
                    .map(url => url.trim().replace(/\/+$/, ''))
                    .filter(Boolean);

                if (clientOrigin) {
                    try {
                        const parsed = new URL(clientOrigin).origin;
                        if (configuredOrigins.includes(parsed)) {
                            frontendBaseUrl = parsed;
                        } else if (configuredOrigins.length > 0) {
                            frontendBaseUrl = configuredOrigins[0];
                        }
                    } catch {
                        frontendBaseUrl = configuredOrigins[0] || 'http://localhost:3000';
                    }
                } else if (configuredOrigins.length > 0) {
                    frontendBaseUrl = configuredOrigins[0];
                }

                const redirectUrl = `${frontendBaseUrl}/checkout/return?order_id=${oid}`;

                const checkoutPayload = {
                    data: {
                        type: "checkouts",
                        attributes: {
                            custom_price: Math.round(Number(order.total_amount) * 100),
                            product_options: {
                                redirect_url: redirectUrl
                            },
                            checkout_data: {
                                email: customerEmail,
                                name: customerName,
                                custom: {
                                    order_id: oid.toString()
                                }
                            }
                        },
                        relationships: {
                            store: {
                                data: {
                                    type: "stores",
                                    id: String(process.env.LEMON_SQUEEZY_STORE_ID)
                                }
                            },
                            variant: {
                                data: {
                                    type: "variants",
                                    id: String(process.env.LEMON_SQUEEZY_VARIANT_ID)
                                }
                            }
                        }
                    }
                };

                const lsResponse = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/vnd.api+json',
                        'Content-Type': 'application/vnd.api+json',
                        'Authorization': `Bearer ${process.env.LEMON_SQUEEZY_API_KEY}`
                    },
                    body: JSON.stringify(checkoutPayload)
                });

                const lsResult = await lsResponse.json();
                if (lsResponse.ok && lsResult.data && lsResult.data.attributes) {
                    checkout_url = lsResult.data.attributes.url;
                } else {
                    console.error('Lemon Squeezy API Error:', lsResult);
                    return res.status(502).json({
                        error: 'bad_gateway',
                        message: 'Failed to create payment session with Lemon Squeezy',
                        details: lsResult.errors || lsResult.message,
                        statusCode: 502
                    });
                }
            }

            const payment_id = await upsertPayment('card', 'pending');

            return res.status(200).json({
                checkout_url,
                payment_id
            });
        }
    } catch (error) {
        console.error('Error creating payment session:', error);
        res.status(500).json({ error: 'internal_error', message: 'Internal Server Error', statusCode: 500 });
    }
};

module.exports = {
    createSession
};
