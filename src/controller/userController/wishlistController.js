import * as wishlistService from '../../services/user/wishlistServices.js';
import { WISHLIST_MESSAGES } from '../../constants/wishlistConstants.js';

// Renders the Wishlist Page
export const getWishlistPage = async (req, res) => {
    try {
        const userId = req.session.user; 
        
        if (!userId) {
            return res.redirect('/login');
        }

        const wishlist = await wishlistService.getActiveWishlist(userId);

        res.render('user/wishlist', {
            layout: 'layout/user',
            pageTitle: 'My Wishlist - Dresson',
            wishlist: wishlist || { products: [] } // Pass empty array if no wishlist exists
        });

    } catch (error) {
        console.error("Error rendering wishlist page:", error);
        res.status(500).send(WISHLIST_MESSAGES.FETCH_ERROR);
    }
};

// Handles the AJAX Fetch request when clicking the Heart icon
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

        const result = await wishlistService.toggleProductInWishlist(userId, productId);

        res.status(200).json({ 
            success: true, 
            action: result.action,
            message: result.action === 'added' ? WISHLIST_MESSAGES.ADDED_SUCCESS : WISHLIST_MESSAGES.REMOVED_SUCCESS
        });

    } catch (error) {
        console.error("Error toggling wishlist item:", error);
        res.status(500).json({ 
            success: false, 
            message: WISHLIST_MESSAGES.TOGGLE_ERROR 
        });
    }
};