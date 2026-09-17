import * as  cartRepository from '../repository/user/cartRepository.js';
import * as wishlistRepository from '../repository/user/wishlistRepository.js';

// For 'display' data dynamically in 'ejs' file by using 'res.locals' object
export const injectHeaderData = async (req, res, next) => {
    try {
        res.locals.cartCount = 0;
        res.locals.wishlistCount = 0;
        res.locals.isLoggedIn = false;
        if (req.session && req.session.user) {
            const userId = req.session.user;
            res.locals.isLoggedIn = true;
            const cart = await cartRepository.getCartDocument(userId);                                                         // It retrieve 'first matching' 'cart' document based on 'userId'
            if (cart && cart.items) {
                res.locals.cartCount = cart.items.reduce((total, item) => total + (item.quantity || 1), 0);                    // Here we 'accumulate' total 'item' 
                // res.locals.cartCount = cart.items.length;
            }

            const wishlist = await wishlistRepository.getWishlistByUserId(userId);                                             // It retrieve the user's wishlist document based 'userId'
            if (wishlist && wishlist.products) {
                res.locals.wishlistCount = wishlist.products.length;
            }
        }
        next();        
    } catch (error) {
        console.error("Error fetching global header data:", error);
        next(); 
    }
};