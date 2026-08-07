import * as wishlistRepository from '../../repository/user/wishlistRepository.js';

export const getActiveWishlist = async (userId) => {
    return await wishlistRepository.findAndPopulateWishlist(userId);
};

export const toggleProductInWishlist = async (userId, productId) => {
    const wishlist = await wishlistRepository.findWishlistByUserId(userId);
    if (!wishlist) {
        await wishlistRepository.addProductToWishlist(userId, productId);
        return { action: 'added' };
    }
    const productExists = wishlist.products.includes(productId);
    if (productExists) {
        await wishlistRepository.removeProductFromWishlist(userId, productId);
        return { action: 'removed' };
    } else {
        await wishlistRepository.addProductToWishlist(userId, productId);
        return { action: 'added' };
    }
};