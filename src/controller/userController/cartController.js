import * as cartService from '../../services/user/cartService.js';
import { CART_MESSAGES } from '../../constants/cartConstants.js';


// Helper function for retrieve 'user id'
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


// For 'display' 'cart' page
export const getCartPage = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.redirect('/login?error=' + encodeURIComponent(CART_MESSAGES.UNAUTHORIZED_VIEW));
        }
        const cartData = await cartService.getUserCartData(userId);
        res.render('user/cart', {
            cart: cartData,
            layout: 'layout/user',
            pageTitle: "Shopping Cart - Dresson",
            activePage: 'cart',
        });
    } catch (error) {
        console.error("Error loading shopping cart:", error);
        res.status(500).send(CART_MESSAGES.INTERNAL_ERROR);
    }
};


// For 'process' of 'add cart'
export const postAddToCart = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            console.warn("[CART BLOCKED] Add to cart attempted without valid user session.");
            if (req.headers.accept && req.headers.accept.includes('json')) {
                return res.status(401).json({ success: false, message: CART_MESSAGES.UNAUTHORIZED_ADD });
            }
            return res.redirect('/login?error=' + encodeURIComponent(CART_MESSAGES.UNAUTHORIZED_ADD));
        }
        const { productId, variantId, quantity, actionType } = req.body;
        if (actionType === 'buy_now') {
            const directBuyCart = await cartService.getDirectBuyItem(productId, variantId, quantity || 1);
            req.session.directBuyCart = directBuyCart;
            return res.redirect('/checkout?mode=direct');
        }
        await cartService.addItemToCart(userId, productId, variantId, quantity || 1);
        if (req.headers.accept && req.headers.accept.includes('json')) {
            return res.status(200).json({
                success: true,
                message: "Cart updated successfully"
            });
        }
        res.redirect('/cart');
    } catch (error) {
        console.error("Add to cart/Buy Now failure:", error.message);
        if (req.headers.accept && req.headers.accept.includes('json')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
        const rawReferer = req.get('referer') || '/shop';
        const [baseUrl, queryString] = rawReferer.split('?');
        const queryParams = new URLSearchParams(queryString || '');
        queryParams.delete('error');
        queryParams.delete('warning');
        const stockKeywords = ['available in stock', 'exceeds', 'maximum', 'sold out', 'limit'];
        const isStockWarning = stockKeywords.some(item => error.message.toLowerCase().includes(item));
        if (isStockWarning) {
            queryParams.set('warning', error.message);
        } else {
            queryParams.set('error', error.message);
        }
        res.redirect(`${baseUrl}?${queryParams.toString()}`);
    }
};


// For adds 'bundle' of 'products' for 'combo offer'
export const postAddComboToCart = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: CART_MESSAGES.UNAUTHORIZED_ADD });
        }
        const { offerId, productIds } = req.body;
        if (!offerId || !productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return res.status(400).json({ success: false, message: "Invalid combo data provided." });
        }
        const updatedCart = await cartService.addComboOfferToCart(userId, offerId, productIds);
        return res.status(200).json({
            success: true,
            message: "Combo offer successfully added to cart!",
            cart: updatedCart
        });
    } catch (error) {
        console.error("Add Combo to Cart failure:", error.message);
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};


// For 'increase' or 'decrease' the 'quantity' of items in 'cart'
export const patchUpdateQuantity = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: CART_MESSAGES.UNAUTHORIZED_MODIFY });
        }
        const { itemId, quantity } = req.body;
        const updatedCart = await cartService.updateItemQuantity(userId, itemId, quantity);
        res.status(200).json({
            success: true,
            message: CART_MESSAGES.QTY_UPDATED,
            cart: updatedCart
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || "Failed to update quantity."
        });
    }
};


// For 'completely deletes' an item from 'cart'
export const deleteRemoveItem = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: CART_MESSAGES.UNAUTHORIZED_MODIFY });
        }
        const { itemId } = req.params;
        const updatedCart = await cartService.removeItemFromCart(userId, itemId);
        res.status(200).json({
            success: true,
            message: CART_MESSAGES.ITEM_REMOVED,
            cart: updatedCart
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || "Failed to remove item."
        });
    }
};