import mongoose from 'mongoose';
import Cart from '../../model/cartModel.js';
import Product from '../../model/productModel.js';
import Wishlist from '../../model/wishlistModel.js';
import Offer from '../../model/offerModel.js';


// Retrieve only 'name', 'brand' etc from 'Cart' for 'display' it
export const getCartPopulatedForDisplay = async (userId) => {
    return await Cart.findOne({ user: userId })
        .populate({    
            path: 'items.product',
            select: 'name brand isListed totalStock variants discount category subCategory images'
        })
        .lean();
};


// Retrieve 'single' product based on 'productId' and 'isListed: true'
export const getActiveProductById = async (productId) => {
    return await Product.findOne({ _id: productId, isListed: true });
};


// Retrieve 'first matching' 'cart' document based on 'userId'
export const getCartDocument = async (userId) => {
    return await Cart.findOne({ user: userId });
};


// For create 'new' document based on 'userId' with 'items' array as 'initial value'. 
export const createEmptyCart = async (userId) => {
    const cart = new Cart({ user: userId, items: [] });
    return await cart.save();
};


// For 'save' 'cartDoc' to database
export const saveCartDocument = async (cartDoc) => {
    return await cartDoc.save();
};


// For find one 'wishlist' document based on 'userId' and 'pull' or 'delete' 'product' array
export const removeProductFromWishlist = async (userId, productId) => {
    if (typeof Wishlist !== 'undefined') {
        try {
            await Wishlist.findOneAndUpdate(
                { user: userId },
                { $pull: { products: productId } }
            );
        } catch (error) {
            console.error("Non-fatal error pulling item from wishlist:", error);
        }
    }
};


// For retrieve 'one' cart document and 'populated' based on 'product' field
export const getCartDocumentPopulated = async (userId) => {
    return await Cart.findOne({ user: userId }).populate('items.product');
};


// For retrieve 'one' 'product' 'document' based on 'productId'
export const getProductById = async (productId) => {
    return await Product.findById(productId);
};


// Retrieve 'active users' based on 'date'
export const getActiveOffers = async () => {
    const currentDate = new Date();
    return await Offer.find({
        startDate: { $lte: currentDate },
        endDate: { $gte: currentDate },
        isManuallyActive: true,
    }).lean();
};


// Retrieve 'offerId' for display it
export const getOfferById = async (offerId) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(offerId)) {
            console.warn(`[Repository Warning] Invalid Offer ID format received: ${offerId}`);
            return null; 
        }
        const offer = await Offer.findById(offerId).lean();      
        return offer;
    } catch (error) {
        console.error("Repository Error in getOfferById:", error);
        throw new Error("Failed to retrieve offer details from the database.");
    }
};