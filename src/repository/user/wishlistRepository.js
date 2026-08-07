import Wishlist from '../../model/wishlistModel.js';

export const findWishlistByUserId = async (userId) => {
    return await Wishlist.findOne({ user: userId });
};

export const findAndPopulateWishlist = async (userId) => {
    return await Wishlist.findOne({ user: userId })
        .populate({
            path: 'products',
            match: { isListed: true }, // Only show active products
            select: 'name brand price images variants discount'
        })
        .lean();
};

export const addProductToWishlist = async (userId, productId) => {
    // upsert: true creates the wishlist if the user doesn't have one yet
    return await Wishlist.findOneAndUpdate(
        { user: userId },
        { $addToSet: { products: productId } }, // $addToSet prevents duplicates
        { returnDocument: 'after', upsert: true }
    );
};

export const removeProductFromWishlist = async (userId, productId) => {
    return await Wishlist.findOneAndUpdate(
        { user: userId },
        { $pull: { products: productId } },
        { returnDocument: 'after', new: true }
    );
};