import * as wishlistRepository from '../../repository/user/wishlistRepository.js';


// Retrieve 'first matching' document based on 'userId' from 'wishlist' collection and adding 'products' data include 'only' 'active' products with only 'name brand price images variants discount' fields
export const getActiveWishlist = async (userId) => {
    return await wishlistRepository.findAndPopulateWishlist(userId);  
};

// For 'toggling' wishlist
export const toggleProductInWishlist = async (userId, productId) => {
    const wishlist = await wishlistRepository.findWishlistByUserId(userId);      // Retrieve 'first matching' document based on 'userId' from 'wishlist' collection
    if (!wishlist) {
        await wishlistRepository.addProductToWishlist(userId, productId);        // For find 'first matching' document and 'update'(ie 'adding' 'unique' product) 
        return { action: 'added' };
    }
    const productExists = wishlist.products.includes(productId);
    if (productExists) {
        await wishlistRepository.removeProductFromWishlist(userId, productId);   // For find 'first matching' document in 'wishlist' and 'update'(ie 'removing' the product)
        return { action: 'removed' };
    } else {
        await wishlistRepository.addProductToWishlist(userId, productId);
        return { action: 'added' };
    }
};