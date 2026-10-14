const db = require('../config/db');
const cartModel = require('../models/cartModel');

function isPositiveInt(value) {
    if (value === undefined || value === null) return false;
    const str = String(value).trim();
    if (!/^\d+$/.test(str)) return false;
    const num = Number(str);
    return Number.isSafeInteger(num) && num > 0;
}

function getCustomerId(req, res) {
    if (!req.user || req.user.role !== 'customer' || !req.user.customer_id) {
        res.status(403).json({
            error: 'forbidden',
            message: 'Administrative and staff accounts cannot create or modify shopping carts',
            statusCode: 403
        });
        return null;
    }
    return req.user.customer_id;
}

const getCart = async (req, res) => {
    try {
        const customer_id = getCustomerId(req, res);
        if (!customer_id) return;
        
        const cart_id = await cartModel.getOrCreateCart(customer_id);
        const items = await cartModel.getCartItems(cart_id);
        
        let total = 0;
        const formattedItems = items.map(item => {
            const price = parseFloat(item.price);
            const subtotal = parseFloat(item.subtotal);
            total += subtotal;
            return {
                ...item,
                price,
                subtotal,
                primary_image_id: item.primary_image_id || null,
                primary_image_url: item.primary_image_url || null
            };
        });

        res.json({
            cart: {
                cart_id,
                items: formattedItems,
                total: parseFloat(total.toFixed(2))
            }
        });
    } catch (error) {
        console.error('Error in getCart:', error);
        res.status(500).json({ error: 'internal_error', message: 'Internal Server Error', statusCode: 500 });
    }
};

const addItem = async (req, res) => {
    let client = null;
    try {
        const customer_id = getCustomerId(req, res);
        if (!customer_id) return;
        
        const { variant_id, quantity } = req.body || {};
        if (!isPositiveInt(variant_id)) {
            return res.status(400).json({ error: 'invalid_request', message: 'variant_id must be a positive integer', statusCode: 400 });
        }
        if (!isPositiveInt(quantity)) {
            return res.status(400).json({ error: 'invalid_request', message: 'quantity must be a positive integer', statusCode: 400 });
        }

        const vid = Number(variant_id);
        const qty = Number(quantity);

        const variant = await cartModel.getVariantInfo(vid);
        if (!variant) {
            return res.status(404).json({ error: 'not_found', message: 'Variant not found', statusCode: 404 });
        }
        if (!variant.is_active) {
            return res.status(400).json({ error: 'invalid_request', message: 'Variant is inactive', statusCode: 400 });
        }

        if (qty > variant.stock_quantity) {
            return res.status(400).json({ error: 'insufficient_stock', message: 'Insufficient stock available', statusCode: 400 });
        }

        if (typeof db.connect === 'function') {
            try {
                const acquired = await db.connect();
                if (acquired && typeof acquired.query === 'function') {
                    client = acquired;
                    await client.query('BEGIN');
                }
            } catch (connErr) {
                client = null;
            }
        }

        const cart_id = await cartModel.getOrCreateCart(customer_id, client || undefined);
        
        // Logical Gate: Lock the cart row for customer to serialize mutations against checkout (Fix 8.3 / D3)
        if (client) {
            await client.query('SELECT cart_id FROM carts WHERE cart_id = $1 FOR UPDATE', [cart_id]);
            
            // Re-read variant info under the gate
            const lockedVariant = await cartModel.getVariantInfo(vid, client);
            if (lockedVariant) {
                if (!lockedVariant.is_active) {
                    await client.query('ROLLBACK');
                    client.release();
                    client = null;
                    return res.status(400).json({ error: 'invalid_request', message: 'Variant is inactive', statusCode: 400 });
                }
                if (qty > lockedVariant.stock_quantity) {
                    await client.query('ROLLBACK');
                    client.release();
                    client = null;
                    return res.status(400).json({ error: 'insufficient_stock', message: 'Insufficient stock available', statusCode: 400 });
                }
            }
        }

        const existingItem = await cartModel.checkItemInCart(cart_id, vid, client || undefined);
        if (existingItem) {
            if (client) {
                await client.query('ROLLBACK');
                client.release();
                client = null;
            }
            return res.status(409).json({ error: 'conflict', message: 'Item already in cart — use PUT to update quantity', statusCode: 409 });
        }

        const cart_item = await cartModel.addItemToCart(cart_id, vid, qty, client || undefined);

        if (client) {
            await client.query('COMMIT');
            client.release();
            client = null;
        }

        res.status(201).json({ message: 'Item added to cart', cart_item });
    } catch (error) {
        if (client) {
            try { await client.query('ROLLBACK'); } catch { /* ignore */ }
            try { client.release(); } catch { /* ignore */ }
            client = null;
        }
        if (error.code === '23505') {
            return res.status(409).json({ error: 'conflict', message: 'Item already in cart — use PUT to update quantity', statusCode: 409 });
        }
        console.error('Error in addItem:', error);
        res.status(500).json({ error: 'internal_error', message: 'Internal Server Error', statusCode: 500 });
    }
};

const updateItemQuantity = async (req, res) => {
    let client = null;
    try {
        const customer_id = getCustomerId(req, res);
        if (!customer_id) return;
        
        if (!isPositiveInt(req.params.id)) {
            return res.status(400).json({ error: 'invalid_request', message: 'id must be a positive integer', statusCode: 400 });
        }
        const cart_item_id = Number(req.params.id);

        const { quantity } = req.body || {};
        if (!isPositiveInt(quantity)) {
            return res.status(400).json({ error: 'invalid_request', message: 'quantity must be a positive integer', statusCode: 400 });
        }
        const qty = Number(quantity);

        if (typeof db.connect === 'function') {
            try {
                const acquired = await db.connect();
                if (acquired && typeof acquired.query === 'function') {
                    client = acquired;
                    await client.query('BEGIN');
                }
            } catch (connErr) {
                client = null;
            }
        }

        const cart_id = await cartModel.getOrCreateCart(customer_id, client || undefined);

        // Logical Gate: Lock cart row before inspecting or modifying items
        if (client) {
            await client.query('SELECT cart_id FROM carts WHERE cart_id = $1 FOR UPDATE', [cart_id]);
        }

        const cartItem = await cartModel.getCartItemDetails(cart_item_id, client || undefined);
        if (!cartItem) {
            if (client) {
                await client.query('ROLLBACK');
                client.release();
                client = null;
            }
            return res.status(404).json({ error: 'not_found', message: 'Cart item not found', statusCode: 404 });
        }

        if (cartItem.cart_id !== cart_id) {
            if (client) {
                await client.query('ROLLBACK');
                client.release();
                client = null;
            }
            return res.status(403).json({ error: 'forbidden', message: 'Unauthorized to update this cart item', statusCode: 403 });
        }

        const variant = await cartModel.getVariantInfo(cartItem.variant_id, client || undefined);
        if (!variant) {
            if (client) {
                await client.query('ROLLBACK');
                client.release();
                client = null;
            }
            return res.status(404).json({ error: 'not_found', message: 'Variant not found', statusCode: 404 });
        }
        if (!variant.is_active) {
            if (client) {
                await client.query('ROLLBACK');
                client.release();
                client = null;
            }
            return res.status(400).json({ error: 'invalid_request', message: 'Variant is inactive', statusCode: 400 });
        }

        if (qty > variant.stock_quantity) {
            if (client) {
                await client.query('ROLLBACK');
                client.release();
                client = null;
            }
            return res.status(400).json({ error: 'insufficient_stock', message: 'Insufficient stock available', statusCode: 400 });
        }

        const updatedItem = await cartModel.updateCartItemQuantity(cart_item_id, qty, client || undefined);

        if (client) {
            await client.query('COMMIT');
            client.release();
            client = null;
        }

        res.json({ message: 'Quantity updated', cart_item: updatedItem });
    } catch (error) {
        if (client) {
            try { await client.query('ROLLBACK'); } catch { /* ignore */ }
            try { client.release(); } catch { /* ignore */ }
            client = null;
        }
        console.error('Error in updateItemQuantity:', error);
        res.status(500).json({ error: 'internal_error', message: 'Internal Server Error', statusCode: 500 });
    }
};

const removeItem = async (req, res) => {
    let client = null;
    try {
        const customer_id = getCustomerId(req, res);
        if (!customer_id) return;
        
        if (!isPositiveInt(req.params.id)) {
            return res.status(400).json({ error: 'invalid_request', message: 'id must be a positive integer', statusCode: 400 });
        }
        const cart_item_id = Number(req.params.id);

        if (typeof db.connect === 'function') {
            try {
                const acquired = await db.connect();
                if (acquired && typeof acquired.query === 'function') {
                    client = acquired;
                    await client.query('BEGIN');
                }
            } catch (connErr) {
                client = null;
            }
        }

        const cart_id = await cartModel.getOrCreateCart(customer_id, client || undefined);

        // Logical Gate: Lock cart row before inspecting or modifying items
        if (client) {
            await client.query('SELECT cart_id FROM carts WHERE cart_id = $1 FOR UPDATE', [cart_id]);
        }

        const cartItem = await cartModel.getCartItemDetails(cart_item_id, client || undefined);
        if (!cartItem) {
            if (client) {
                await client.query('ROLLBACK');
                client.release();
                client = null;
            }
            return res.status(404).json({ error: 'not_found', message: 'Cart item not found', statusCode: 404 });
        }

        if (cartItem.cart_id !== cart_id) {
            if (client) {
                await client.query('ROLLBACK');
                client.release();
                client = null;
            }
            return res.status(403).json({ error: 'forbidden', message: 'Unauthorized to remove this cart item', statusCode: 403 });
        }

        await cartModel.removeCartItem(cart_item_id, client || undefined);

        if (client) {
            await client.query('COMMIT');
            client.release();
            client = null;
        }

        res.json({ message: 'Item removed from cart' });
    } catch (error) {
        if (client) {
            try { await client.query('ROLLBACK'); } catch { /* ignore */ }
            try { client.release(); } catch { /* ignore */ }
            client = null;
        }
        console.error('Error in removeItem:', error);
        res.status(500).json({ error: 'internal_error', message: 'Internal Server Error', statusCode: 500 });
    }
};

module.exports = {
    getCart,
    addItem,
    updateItemQuantity,
    removeItem
};
