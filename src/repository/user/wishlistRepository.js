import Wishlist from '../../model/wishlistModel.js';

// Retrieve 'first matching' document based on 'userId' from 'wishlist' collection
export const findWishlistByUserId = async (userId) => {
    return await Wishlist.findOne({ user: userId });
};

// Retrieve 'first matching' document based on 'userId' from 'wishlist' collection and adding 'products' data include 'only' 'active' products with only 'name brand price images variants discount' fields
export const findAndPopulateWishlist = async (userId) => {
    return await Wishlist.findOne({ user: userId })
        .populate({
            path: 'products',
            match: { isListed: true },                                  // If '{isListed:false}' products 'displaying' but it show as 'null'(Eg, '[{name: "vanHuesen formal shirt"},null,{name: "Biba..."}]')
            select: 'name brand price images variants discount'
        })
        .lean();
};


// For find 'first matching' document and 'update'(ie 'adding' 'unique' product) 
export const addProductToWishlist = async (userId, productId) => {
    return await Wishlist.findOneAndUpdate(
        { user: userId }, 
        { $addToSet: { products: productId } },                       // '$addToSet' adds only 'unique' value into array so it 'prevents' duplicate products in the array(ie 'products' is the 'array' created in 'wishlist' model) wishlist.
        { upsert: true, new: true }                                   // 'upsert: true' is only used with 'update' methods(like 'updateOne()','updateMany()', and 'replaceOne()', 'findOneAndUpdate()' etc) method used for create a new 'document'
    );
};


// For find 'first matching' document in 'wishlist' and 'update'(ie 'removing' the product)
export const removeProductFromWishlist = async (userId, productId) => {
    return await Wishlist.findOneAndUpdate(
        { user: userId },
        { $pull: { products: productId } },                         // '$pull' is used only in 'array' for 'remove' the 'item'(ie 'productId')
        { returnDocument: 'after', new: true }                      // Here both 'returnDocument: 'after'(ie for 'mongodb' driver) and 'new: true'(ie for 'mongoose') are used for same purpose ie for 'create' a 'new document'. 
    );
};