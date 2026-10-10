const db = require('../config/db');

const createOrder = async (customer_id, address_id, delivery_mode) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        // 1. Get cart
        const cartResult = await client.query('SELECT cart_id FROM carts WHERE customer_id = $1', [customer_id]);
        if (cartResult.rows.length === 0) {
            await client.query('ROLLBACK');
            throw new Error('Cart is empty');
        }
        const cart_id = cartResult.rows[0].cart_id;

        // 2. Get cart items
        const cartItemsResult = await client.query('SELECT variant_id, quantity FROM cart_items WHERE cart_id = $1', [cart_id]);
        const cartItems = cartItemsResult.rows;
        if (cartItems.length === 0) {
            await client.query('ROLLBACK');
            throw new Error('Cart is empty');
        }

        // 3. Lock variant rows & check stock
        let total_amount = 0;
        const itemsWithDetails = [];
        const outOfStockNames = [];

        // Sort variant_ids to prevent deadlocks
        const sortedItems = [...cartItems].sort((a, b) => a.variant_id - b.variant_id);

        for (const item of sortedItems) {
            const variantResult = await client.query(`
                SELECT v.stock_quantity, v.price, v.variant_name, p.product_name 
                FROM product_variants v
                JOIN products p ON v.product_id = p.product_id
                WHERE v.variant_id = $1 FOR UPDATE
            `, [item.variant_id]);

            if (variantResult.rows.length === 0) {
                outOfStockNames.push(`Unknown Variant ${item.variant_id}`);
                continue;
            }

            const variant = variantResult.rows[0];
            const name = variant.variant_name ? `${variant.product_name} - ${variant.variant_name}` : variant.product_name;

            if (variant.stock_quantity < item.quantity) {
                outOfStockNames.push(name);
            } else {
                const unit_price = parseFloat(variant.price);
                total_amount += unit_price * item.quantity;
                itemsWithDetails.push({
                    ...item,
                    unit_price,
                    name,
                    product_name: variant.product_name,
                    variant_name: variant.variant_name
                });
            }
        }

        if (outOfStockNames.length > 0) {
            await client.query('ROLLBACK');
            throw new Error(`Insufficient stock for: ${outOfStockNames.join(', ')}`);
        }

        // 4. Get Address and ETA
        const addressResult = await client.query(`
            SELECT a.address_line1, a.address_line2, a.city_id, a.zip_code, c.is_main_city, c.city_name
            FROM addresses a
            JOIN cities c ON a.city_id = c.city_id
            WHERE a.address_id = $1 AND a.customer_id = $2
        `, [address_id, customer_id]);

        if (addressResult.rows.length === 0) {
            await client.query('ROLLBACK');
            throw new Error('Address not found or does not belong to customer');
        }

        const address = addressResult.rows[0];
        const estimated_delivery_days = address.is_main_city ? 5 : 7;

        // 5. Create Order
        const orderResult = await client.query(`
            INSERT INTO orders (customer_id, total_amount, status)
            VALUES ($1, $2, 'pending')
            RETURNING order_id, order_date, status, total_amount
        `, [customer_id, total_amount]);
        const order = orderResult.rows[0];

        // 6. Create Order Items and Update Stock
        for (const item of itemsWithDetails) {
            await client.query(`
                INSERT INTO order_items (order_id, variant_id, quantity, unit_price)
                VALUES ($1, $2, $3, $4)
            `, [order.order_id, item.variant_id, item.quantity, item.unit_price]);

            await client.query(`
                UPDATE product_variants
                SET stock_quantity = stock_quantity - $1, updated_at = NOW()
                WHERE variant_id = $2
            `, [item.quantity, item.variant_id]);
        }

        // 7. Create Delivery
        const deliveryResult = await client.query(`
            INSERT INTO deliveries (order_id, delivery_mode, delivery_address_line1, delivery_address_line2, delivery_city_id, delivery_zip_code, estimated_delivery_days)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING delivery_id, delivery_mode, delivery_address_line1, delivery_address_line2, delivery_city_id as city_id, delivery_zip_code as zip_code, estimated_delivery_days, delivery_status, tracking_number
        `, [
            order.order_id,
            delivery_mode,
            address.address_line1,
            address.address_line2,
            address.city_id,
            address.zip_code,
            estimated_delivery_days
        ]);
        const delivery = deliveryResult.rows[0];

        // 8. Clear Cart
        await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cart_id]);

        await client.query('COMMIT');

        return {
            ...order,
            total_amount: parseFloat(order.total_amount),
            items: itemsWithDetails.map(i => ({
                variant_id: i.variant_id,
                quantity: i.quantity,
                unit_price: i.unit_price
            })),
            delivery: delivery
        };

    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};

const getOrders = async (customer_id) => {
    const query = `
        SELECT o.order_id, o.order_date, o.status, o.total_amount, 
               COALESCE(SUM(oi.quantity), 0) as item_count
        FROM orders o
        LEFT JOIN order_items oi ON o.order_id = oi.order_id
        WHERE o.customer_id = $1
        GROUP BY o.order_id
        ORDER BY o.order_date DESC
    `;
    const result = await db.query(query, [customer_id]);
    return result.rows.map(row => ({
        ...row,
        total_amount: parseFloat(row.total_amount),
        item_count: parseInt(row.item_count)
    }));
};

const getOrderById = async (order_id, customer_id) => {
    const orderResult = await db.query(`
        SELECT order_id, order_date, status, total_amount
        FROM orders
        WHERE order_id = $1 AND customer_id = $2
    `, [order_id, customer_id]);

    if (orderResult.rows.length === 0) return null;
    const order = orderResult.rows[0];
    order.total_amount = parseFloat(order.total_amount);

    const itemsResult = await db.query(`
        SELECT oi.variant_id, p.product_name, v.variant_name, oi.quantity, oi.unit_price
        FROM order_items oi
        JOIN product_variants v ON oi.variant_id = v.variant_id
        JOIN products p ON v.product_id = p.product_id
        WHERE oi.order_id = $1
    `, [order_id]);
    const items = itemsResult.rows.map(item => ({
        ...item,
        unit_price: parseFloat(item.unit_price)
    }));

    const deliveryResult = await db.query(`
        SELECT d.delivery_mode, d.delivery_address_line1, c.city_name, d.delivery_status, d.tracking_number, d.estimated_delivery_days
        FROM deliveries d
        JOIN cities c ON d.delivery_city_id = c.city_id
        WHERE d.order_id = $1
    `, [order_id]);
    const delivery = deliveryResult.rows[0] || null;

    const paymentResult = await db.query(`
        SELECT payment_method, payment_status
        FROM payments
        WHERE order_id = $1
    `, [order_id]);
    const payment = paymentResult.rows[0] || null;

    return {
        ...order,
        items,
        delivery,
        payment
    };
};

module.exports = {
    createOrder,
    getOrders,
    getOrderById
};
