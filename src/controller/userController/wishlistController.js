import * as wishlistService from '../../services/user/wishlistServices.js';
import { WISHLIST_MESSAGES } from '../../constants/wishlistConstants.js';

//  For 'display' 'wishlist' page
export const getWishlistPage = async (req, res) => {
    try {
        const userId = req.session.user;         
        if (!userId) {
            return res.redirect('/login');
        }
        const wishlist = await wishlistService.getActiveWishlist(userId);                                                        // Retrieve 'first matching' document based on 'userId' from 'wishlist' collection and adding 'products' data include 'only' 'active' products with only 'name brand price images variants discount' fields
        res.render('user/wishlist', {
            layout: 'layout/user',
            pageTitle: 'My Wishlist - Dresson',
            wishlist: wishlist || { products: [] } ,
            activeSidebar: 'wishlist'
        });
    } catch (error) {
        console.error("Error rendering wishlist page:", error);
        res.status(500).send(WISHLIST_MESSAGES.FETCH_ERROR);
    }
};


// For handle the 'wishlist' operation when user 'click' 'heart' symbol
export const toggleWishlistItem = async (req, res) => {
    try {
        const userId = req.session.user;
        const { productId } = req.body;        
        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: WISHLIST_MESSAGES.UNAUTHORIZED 
            });
        }        
        const result = await wishlistService.toggleProductInWishlist(userId, productId);                                          //  It 'adds' and 'remove' products into 'wishlist' collection when user click the 'heart/love' symbol
        res.status(200).json({ 
            success: true, 
            action: result.action , 
        });
    } catch (error) {
        console.error("Error toggling wishlist item:", error);
        res.status(500).json({ 
            success: false, 
            message: WISHLIST_MESSAGES.TOGGLE_ERROR 
        });
    }
};