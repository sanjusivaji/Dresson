import * as cartService from '../../services/user/cartService.js';
import { CART_MESSAGES } from '../../constants/cartConstants.js';


// It is 'helper' function used for 'extract' 'user id' in different way from 'req' object
const getUserId = (req) => {
    if (req.session && req.session.user) {                                                          // Here 'req.session' means user in 'express session' and also stores user data like 'name', 'email', 'hashed password' etc in 'req.session.user' and it 'first' try to return 'user._id'(ie mongodb id format) and if it is 'not' available it return 'user.id'(ie a 'plain string') or 'user' itself
        return req.session.user._id || req.session.user.id || req.session.user;
    }
    if (req.session && req.session.userId) {                                                       // Here 'req.session.userId' mostly created when 'userId' stores in 'redis'
        return req.session.userId;
    }
    if (req.user) {                                                                                // Here 'req.user' means whole user data stores in 'req' object and it mostly happens when we use 'JWT' or 'passport' etc and it also retrieve 3 type of user data 
        return req.user._id || req.user.id || req.user;
    }
    return null;
};

// For 'display' 'cart' page
export const getCartPage = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.redirect('/login?error=' + encodeURIComponent(CART_MESSAGES.UNAUTHORIZED_VIEW)); // Here this is the '!user' case and here we create an 'error' message in '/login' route and  It is the built-in 'js' function used for 'translates' all space and '&', '?' etc  like symbols into '%20’(ie “Stock Limit Reached” becomes '"Stock%20Limit%20Reached”) because 'url' has strict rule that 'cannot' contain spaces and other characters and later we convert it into 'human readable' messages by using 'decodeURIComponent()’
        }
        const cartData = await cartService.getUserCartData(userId);                                     // 'getUserCartData()' is used for 'cross checking' the data in 'cart' and 'recreate' it
    //    console.log(cartData)
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


// For 'add' a 'new' 'product' to 'cart' or 'Buy Now'
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
        
        // ✨ INTERCEPT BUY NOW
        if (actionType === 'buy_now') {
            // Generate temporary cart (using the getDirectBuyItem service function we created)
            const directBuyCart = await cartService.getDirectBuyItem(productId, variantId, quantity || 1);
            
            // Save it to the session
            req.session.directBuyCart = directBuyCart;
            
            // Redirect to checkout with the 'direct' mode flag
            return res.redirect('/checkout?mode=direct');
        }

        // ORIGINAL: Standard Add To Cart logic
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


// export const postAddToCart = async (req, res) => {
//     try {
//         const userId = getUserId(req);                                                                      // Created above for capture 'userId'
//         if (!userId) {
//             console.warn("[CART BLOCKED] Add to cart attempted without valid user session.");
//             if (req.headers.accept && req.headers.accept.includes('json')) {                                //  Here checks 'req' object contains 'headers' property(ie it contains all 'header' that send through 'fetch()', 'axios()' etc and is it contains 'accept'(ie it tells what kind of data we need as 'response' like 'text/html', 'application/json' etc) header and this 'accept' header contains 'json' string we can return 'status' and 'message' to 'front end' and here it write in '!userId' case, the 'message' will same kind. 
//                 return res.status(401).json({ success: false, message: CART_MESSAGES.UNAUTHORIZED_ADD });
//             }
//             return res.redirect('/login?error=' + encodeURIComponent(CART_MESSAGES.UNAUTHORIZED_ADD));       // Actually it is the 'else' case(ie some 'error' occurs but 'no' 'json' message case)and this is also the '!user' case and here we create an 'error' message in '/login' route and  It is the built-in 'js' function used for 'translates' all space and '&', '?' etc  like symbols into '%20’(ie “Stock Limit Reached” becomes '"Stock%20Limit%20Reached”) because 'url' has strict rule that 'cannot' contain spaces and other characters and later we convert it into 'human readable' messages by using 'decodeURIComponent()’
//         }
//         const { productId, variantId, quantity, actionType } = req.body;        
//         await cartService.addItemToCart(userId, productId, variantId, quantity || 1);                       // For get single 'cart' document,create a 'empty' cart document, add 'new' quantity , calculate 'final price' and 'save' this into 'data base' and 'remove' product from 'wishlist'. 
//         if (req.headers.accept && req.headers.accept.includes('json')) {  
//             return res.status(200).json({ 
//                 success: true, 
//                 message: "Cart updated successfully" 
//             });
//         }
//         if (actionType === 'buy_now') {                                                                    // Value of 'actionType' get through 'argument'.
//             return res.redirect('/checkout');
//         }
//         res.redirect('/cart');
//     } catch (error) {
//         console.error("Add to cart failure:", error.message);
//         if (req.headers.accept && req.headers.accept.includes('json')) {
//             return res.status(400).json({ 
//                 success: false, 
//                 message: error.message 
//             });
//         }
//         const rawReferer = req.get('referer') || '/shop';                                                 //  ‘req.get()’ is  used to read ‘HTTP headers’ and  'referer' is the specific ‘header’ it is used for it ‘captures’ the ‘URL’ of the ‘previous’(‘not’ current) page
//         const [baseUrl, queryString] = rawReferer.split('?');
//         const queryParams = new URLSearchParams(queryString || '');                                       // Here 'new URLSearchParams()'  is the 'built-in' 'js' method and it used for 'make' string parameter(ie especially messy parameters that have no proper '&&' etc and we get '"color=red&size=M&error=failed"  type of parameters when we use 'req.get('referer')' ) into 'js' object(ie 'color: red', 'size: M' like that)so we can use 'get()', 'set()', 'delete()' like methods with it.         
//         queryParams.delete('error');                                                                      // Here 'delete()' is built 'js' 'method used for 'delete' the 'key-value' pairs from an 'object'(if we use it in 'array' it makes an 'hole')and here it 'delete' 'error' key with its 'value' because we don't need the 'error' or 'warning' after displaying its message
//         queryParams.delete('warning');                
//         const stockKeywords = ['available in stock', 'exceeds', 'maximum', 'sold out', 'limit'];
//         const isStockWarning = stockKeywords.some(item => error.message.toLowerCase().includes(item));    // This is code for 'error.message'(ie it happens only when 'error' occurs)and 'some()' checks 'any' one 'item' in 'stockKeywords' array(ie 'exceeds', 'maximum' etc)'includes' in 'error.message', if it 'includes' we set a 'warning' message and in 'else' case we set a 'error.message'.        
//         if (isStockWarning) {
//             queryParams.set('warning', error.message);
//         } else {
//             queryParams.set('error', error.message);
//         }        
//         res.redirect(`${baseUrl}?${queryParams.toString()}`);
//     }
// };



// For adding a 'Fixed Bundle Price' combo to the cart
export const postAddComboToCart = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: CART_MESSAGES.UNAUTHORIZED_ADD });
        }

        const { offerId, productIds } = req.body;
        
        // Basic validation to ensure we have the necessary data
        if (!offerId || !productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return res.status(400).json({ success: false, message: "Invalid combo data provided." });
        }

        // Delegate to service to handle complex combo logic
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



// For 'update' 'quantity' in cart(ie for '+' or '-' button)
export const patchUpdateQuantity = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: CART_MESSAGES.UNAUTHORIZED_MODIFY });
        }
        const { itemId, quantity } = req.body;
        const updatedCart = await cartService.updateItemQuantity(userId, itemId, quantity);                  //  For 'update' item quantity(ie '+' and '-' button)             
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

// For 'remove' item from cart
export const deleteRemoveItem = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: CART_MESSAGES.UNAUTHORIZED_MODIFY });
        }
        const { itemId } = req.params;
        const updatedCart = await cartService.removeItemFromCart(userId, itemId);                            // For 'remove' item from cart and 'save' that data.        
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