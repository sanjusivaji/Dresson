import * as cartService from '../../services/user/cartService.js';

// For retrieve 'user' details and use it here only.
const getUserId = (req) => {
    if (req.session && req.session.user) {
        return req.session.user._id || req.session.user.id || req.session.user;
    }
    if (req.session && req.session.userId) {
        return req.session.userId;
    }
    if (req.user) {
        return req.user._id || req.user.id || req.user;
    }
    return null;
};

// For 'display' cart page
export const getCartPage = async (req, res) => {
    try {
        const userId = getUserId(req);             // Created just above
        if (!userId) {
            return res.redirect('/login?error=' + encodeURIComponent('Please log in to view your cart.'));
        }
        const cartData = await cartService.getUserCart(userId);
        res.render('user/cart', {
            cart: cartData,
            layout: 'layout/user',
            pageTitle: "Shopping Cart - Dresson",
            activePage: 'cart'
        });
    } catch (error) {
        console.error("Error loading shopping cart:", error);
        res.status(500).send("Internal Server Error loading cart layout.");
    }
};

// For add product into cart
export const postAddToCart = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            console.warn("[CART BLOCKED] Add to cart attempted without valid user session.");
            return res.redirect('/login?error=' + encodeURIComponent('Please log in to add items to your cart.'));
        }
        const { productId, variantId, quantity, actionType } = req.body;
        await cartService.addItemToCart(userId, productId, variantId, quantity || 1);
        if (actionType === 'buy_now') {
            return res.redirect('/checkout');
        }
        res.redirect('/cart');
    } catch (error) {
        console.error("Add to cart failure:", error.message);
        const rawReferer = req.get('referer') || '/shop';
        const [baseUrl, queryString] = rawReferer.split('?');
        const queryParams = new URLSearchParams(queryString || '');
        queryParams.delete('error');
        queryParams.delete('warning');
        const stockKeywords = ['available in stock', 'exceeds', 'maximum', 'sold out', 'limit'];
        const isStockWarning = stockKeywords.some(keyword => error.message.toLowerCase().includes(keyword));
        if (isStockWarning) {
            queryParams.set('warning', error.message);
        } else {
            queryParams.set('error', error.message);
        }
        res.redirect(`${baseUrl}?${queryParams.toString()}`);
    }
};

// For 'update' / add product in cart
export const patchUpdateQuantity = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: "Please log in to modify cart." });
        }
        const { itemId, quantity } = req.body;
        const updatedCart = await cartService.updateItemQuantity(userId, itemId, quantity);        
        res.status(200).json({
            success: true,
            message: "Quantity updated successfully.",
            cart: updatedCart
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || "Failed to update quantity."
        });
    }
};

// For 'delete' from 'cart'
export const deleteRemoveItem = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: "Please log in to modify cart." });
        }
        const { itemId } = req.params;
        const updatedCart = await cartService.removeItemFromCart(userId, itemId);
        res.status(200).json({
            success: true,
            message: "Item removed from cart.",
            cart: updatedCart
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || "Failed to remove item."
        });
    }
};