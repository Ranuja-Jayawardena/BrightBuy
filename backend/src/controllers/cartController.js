const cartModel = require('../models/cartModel');

const getCart = async (req, res) => {
    try {
        const { customer_id } = req.user;
        if (!customer_id) return res.status(403).json({ error: 'Only customers can have carts' });
        
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
                primary_image_id: item.primary_image_id || null
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
        res.status(500).json({ error: 'Server error' });
    }
};

const addItem = async (req, res) => {
    try {
        const { customer_id } = req.user;
        if (!customer_id) return res.status(403).json({ error: 'Only customers can add items to cart' });
        
        const { variant_id, quantity } = req.body;
        if (!variant_id || !quantity || quantity <= 0) {
            return res.status(400).json({ error: 'Invalid input' });
        }

        const variant = await cartModel.getVariantInfo(variant_id);
        if (!variant || !variant.is_active) {
            return res.status(400).json({ error: 'Variant is inactive or not found' });
        }

        if (quantity > variant.stock_quantity) {
            return res.status(400).json({ error: 'Insufficient stock' });
        }

        const cart_id = await cartModel.getOrCreateCart(customer_id);
        
        const existingItem = await cartModel.checkItemInCart(cart_id, variant_id);
        if (existingItem) {
            return res.status(409).json({ error: 'Item already in cart — use PUT to update quantity' });
        }

        const cart_item = await cartModel.addItemToCart(cart_id, variant_id, quantity);
        res.status(201).json({ message: 'Item added to cart', cart_item });
    } catch (error) {
        console.error('Error in addItem:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

const updateItemQuantity = async (req, res) => {
    try {
        const { customer_id } = req.user;
        if (!customer_id) return res.status(403).json({ error: 'Only customers can update cart items' });
        
        const cart_item_id = req.params.id;
        const { quantity } = req.body;
        
        if (!quantity || quantity <= 0) {
            return res.status(400).json({ error: 'Invalid quantity' });
        }

        const cartItem = await cartModel.getCartItemDetails(cart_item_id);
        if (!cartItem) {
            return res.status(404).json({ error: 'Cart item not found' });
        }

        const cart_id = await cartModel.getOrCreateCart(customer_id);
        if (cartItem.cart_id !== cart_id) {
            return res.status(403).json({ error: 'Unauthorized to update this cart item' });
        }

        const variant = await cartModel.getVariantInfo(cartItem.variant_id);
        if (!variant || !variant.is_active) {
            return res.status(400).json({ error: 'Variant is inactive or not found' });
        }

        if (quantity > variant.stock_quantity) {
            return res.status(400).json({ error: 'Insufficient stock' });
        }

        const updatedItem = await cartModel.updateCartItemQuantity(cart_item_id, quantity);
        res.json({ message: 'Quantity updated', cart_item: updatedItem });
    } catch (error) {
        console.error('Error in updateItemQuantity:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

const removeItem = async (req, res) => {
    try {
        const { customer_id } = req.user;
        if (!customer_id) return res.status(403).json({ error: 'Only customers can remove cart items' });
        
        const cart_item_id = req.params.id;

        const cartItem = await cartModel.getCartItemDetails(cart_item_id);
        if (!cartItem) {
            return res.status(404).json({ error: 'Cart item not found' });
        }

        const cart_id = await cartModel.getOrCreateCart(customer_id);
        if (cartItem.cart_id !== cart_id) {
            return res.status(403).json({ error: 'Unauthorized to remove this cart item' });
        }

        await cartModel.removeCartItem(cart_item_id);
        res.json({ message: 'Item removed from cart' });
    } catch (error) {
        console.error('Error in removeItem:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    getCart,
    addItem,
    updateItemQuantity,
    removeItem
};
