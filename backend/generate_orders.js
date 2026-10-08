const fs = require('fs');

const customers = [
    { email: 'alice@example.com', city: 'Austin' },
    { email: 'bob@example.com', city: 'Houston' },
    { email: 'charlie@example.com', city: 'San Antonio' },
    { email: 'diana@example.com', city: 'El Paso' },
    { email: 'eve@example.com', city: 'Fort Worth' },
];

const variants = [
    { sku: 'ELC-001-WHT', price: 39.99 },
    { sku: 'ELC-002-STD', price: 149.99 },
    { sku: 'SPH-001-BLK-128', price: 799.00 },
    { sku: 'LAP-001-16G-512', price: 1299.00 },
    { sku: 'AUD-001-BLK', price: 299.00 },
    { sku: 'HAP-001-WHT', price: 179.99 },
    { sku: 'KIT-001-BLK', price: 99.99 },
    { sku: 'CLN-001-WHT', price: 399.00 },
    { sku: 'APP-001-BLK', price: 69.00 },
    { sku: 'MCL-001-WHT-M', price: 49.50 }
];

const statuses = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];

let sql = `-- 07_orders.sql: Seed 30+ historical orders
-- Written by Member D (Backend - Orders)

`;

const numOrders = 35;
let orderItemsSql = '';
let paymentsSql = '';
let deliveriesSql = '';

for (let i = 1; i <= numOrders; i++) {
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const numItems = Math.floor(Math.random() * 3) + 1;
    
    let totalAmount = 0;
    const items = [];
    
    for (let j = 0; j < numItems; j++) {
        const variant = variants[Math.floor(Math.random() * variants.length)];
        const quantity = Math.floor(Math.random() * 2) + 1;
        totalAmount += variant.price * quantity;
        items.push({ variant, quantity });
    }
    
    // Format totalAmount to 2 decimal places
    totalAmount = totalAmount.toFixed(2);
    
    // Create random order date in past 6 months
    const dateOffset = Math.floor(Math.random() * 180) * 24 * 60 * 60 * 1000;
    const orderDate = new Date(Date.now() - dateOffset).toISOString();
    
    sql += `-- Order ${i}
INSERT INTO orders (customer_id, order_date, status, total_amount) VALUES (
    (SELECT customer_id FROM customers c JOIN users u ON c.user_id = u.user_id WHERE u.email = '${customer.email}'),
    '${orderDate}',
    '${status}',
    ${totalAmount}
);

`;

    for (const item of items) {
        orderItemsSql += `INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET ${numOrders - i}),
    (SELECT variant_id FROM product_variants WHERE variant_sku = '${item.variant.sku}'),
    ${item.quantity},
    ${item.variant.price}
);
`;
    }
    
    // Payments
    let paymentStatus = 'completed';
    let paymentMethod = Math.random() > 0.5 ? 'card' : 'cod';
    if (status === 'pending') {
        paymentStatus = paymentMethod === 'card' ? 'pending' : 'cod_pending';
    } else if (status === 'cancelled') {
        paymentStatus = 'failed';
    }

    paymentsSql += `INSERT INTO payments (order_id, payment_method, payment_status, amount, transaction_id) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET ${numOrders - i}),
    '${paymentMethod}',
    '${paymentStatus}',
    ${totalAmount},
    'TXN-${Math.floor(Math.random() * 1000000)}'
);
`;

    // Deliveries
    let deliveryStatus = 'pending';
    if (status === 'shipped') deliveryStatus = 'in_transit';
    if (status === 'delivered') deliveryStatus = 'delivered';
    if (status === 'cancelled') deliveryStatus = 'cancelled';
    
    const deliveryMode = Math.random() > 0.5 ? 'home_delivery' : 'store_pickup';
    
    deliveriesSql += `INSERT INTO deliveries (order_id, delivery_mode, delivery_address_line1, delivery_city_id, delivery_zip_code, delivery_status) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET ${numOrders - i}),
    '${deliveryMode}',
    '123 Random St',
    (SELECT city_id FROM cities WHERE city_name = '${customer.city}'),
    '70000',
    '${deliveryStatus}'
);
`;
}

sql += `
-- Order Items
${orderItemsSql}

-- Payments
${paymentsSql}

-- Deliveries
${deliveriesSql}
`;

fs.writeFileSync('c:/Users/User/Documents/GitHub/BrightBuy/backend/db/seed/07_orders.sql', sql);
console.log('Generated 07_orders.sql');
