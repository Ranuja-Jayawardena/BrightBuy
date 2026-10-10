const db = require('../config/db');

// Get cart for customer, or create if not exists
const getOrCreateCart = async (customer_id) => {
    let result = await db.query('SELECT cart_id FROM carts WHERE customer_id = $1', [customer_id]);
    if (result.rows.length === 0) {
        result = await db.query(
            'INSERT INTO carts (customer_id) VALUES ($1) RETURNING cart_id',
            [customer_id]
        );
    }
    return result.rows[0].cart_id;
};

const getCartItems = async (cart_id) => {
    const query = `
        SELECT 
            ci.cart_item_id, 
            ci.variant_id, 
            pv.variant_sku, 
            pv.variant_name, 
            p.product_name,
            (SELECT image_id FROM product_images WHERE product_id = p.product_id AND is_primary = true LIMIT 1) as primary_image_id,
            pv.price, 
            ci.quantity, 
            (pv.price * ci.quantity) AS subtotal, 
            pv.stock_quantity
        FROM cart_items ci
        JOIN product_variants pv ON ci.variant_id = pv.variant_id
        JOIN products p ON pv.product_id = p.product_id
        WHERE ci.cart_id = $1
    `;
    const result = await db.query(query, [cart_id]);
    return result.rows;
};

const getVariantInfo = async (variant_id) => {
    const result = await db.query(
        'SELECT is_active, stock_quantity FROM product_variants WHERE variant_id = $1',
        [variant_id]
    );
    return result.rows[0];
};

const checkItemInCart = async (cart_id, variant_id) => {
    const result = await db.query(
        'SELECT cart_item_id FROM cart_items WHERE cart_id = $1 AND variant_id = $2',
        [cart_id, variant_id]
    );
    return result.rows[0];
};

const addItemToCart = async (cart_id, variant_id, quantity) => {
    const result = await db.query(
        'INSERT INTO cart_items (cart_id, variant_id, quantity) VALUES ($1, $2, $3) RETURNING cart_item_id, variant_id, quantity',
        [cart_id, variant_id, quantity]
    );
    return result.rows[0];
};

const updateCartItemQuantity = async (cart_item_id, quantity) => {
    const result = await db.query(
        'UPDATE cart_items SET quantity = $1 WHERE cart_item_id = $2 RETURNING cart_item_id, quantity',
        [quantity, cart_item_id]
    );
    return result.rows[0];
};

const removeCartItem = async (cart_item_id) => {
    await db.query('DELETE FROM cart_items WHERE cart_item_id = $1', [cart_item_id]);
};

const getCartItemDetails = async (cart_item_id) => {
    const result = await db.query(
        'SELECT cart_id, variant_id, quantity FROM cart_items WHERE cart_item_id = $1',
        [cart_item_id]
    );
    return result.rows[0];
};

module.exports = {
    getOrCreateCart,
    getCartItems,
    getVariantInfo,
    checkItemInCart,
    addItemToCart,
    updateCartItemQuantity,
    removeCartItem,
    getCartItemDetails
};
