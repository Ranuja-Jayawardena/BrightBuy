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

        const cart_id = await cartModel.getOrCreateCart(customer_id);
        
        const existingItem = await cartModel.checkItemInCart(cart_id, vid);
        if (existingItem) {
            return res.status(409).json({ error: 'conflict', message: 'Item already in cart — use PUT to update quantity', statusCode: 409 });
        }

        const cart_item = await cartModel.addItemToCart(cart_id, vid, qty);
        res.status(201).json({ message: 'Item added to cart', cart_item });
    } catch (error) {
        console.error('Error in addItem:', error);
        res.status(500).json({ error: 'internal_error', message: 'Internal Server Error', statusCode: 500 });
    }
};

const updateItemQuantity = async (req, res) => {
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

        const cartItem = await cartModel.getCartItemDetails(cart_item_id);
        if (!cartItem) {
            return res.status(404).json({ error: 'not_found', message: 'Cart item not found', statusCode: 404 });
        }

        const cart_id = await cartModel.getOrCreateCart(customer_id);
        if (cartItem.cart_id !== cart_id) {
            return res.status(403).json({ error: 'forbidden', message: 'Unauthorized to update this cart item', statusCode: 403 });
        }

        const variant = await cartModel.getVariantInfo(cartItem.variant_id);
        if (!variant) {
            return res.status(404).json({ error: 'not_found', message: 'Variant not found', statusCode: 404 });
        }
        if (!variant.is_active) {
            return res.status(400).json({ error: 'invalid_request', message: 'Variant is inactive', statusCode: 400 });
        }

        if (qty > variant.stock_quantity) {
            return res.status(400).json({ error: 'insufficient_stock', message: 'Insufficient stock available', statusCode: 400 });
        }

        const updatedItem = await cartModel.updateCartItemQuantity(cart_item_id, qty);
        res.json({ message: 'Quantity updated', cart_item: updatedItem });
    } catch (error) {
        console.error('Error in updateItemQuantity:', error);
        res.status(500).json({ error: 'internal_error', message: 'Internal Server Error', statusCode: 500 });
    }
};

const removeItem = async (req, res) => {
    try {
        const customer_id = getCustomerId(req, res);
        if (!customer_id) return;
        
        if (!isPositiveInt(req.params.id)) {
            return res.status(400).json({ error: 'invalid_request', message: 'id must be a positive integer', statusCode: 400 });
        }
        const cart_item_id = Number(req.params.id);

        const cartItem = await cartModel.getCartItemDetails(cart_item_id);
        if (!cartItem) {
            return res.status(404).json({ error: 'not_found', message: 'Cart item not found', statusCode: 404 });
        }

        const cart_id = await cartModel.getOrCreateCart(customer_id);
        if (cartItem.cart_id !== cart_id) {
            return res.status(403).json({ error: 'forbidden', message: 'Unauthorized to remove this cart item', statusCode: 403 });
        }

        await cartModel.removeCartItem(cart_item_id);
        res.json({ message: 'Item removed from cart' });
    } catch (error) {
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
