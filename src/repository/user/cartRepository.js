import Cart from '../../model/cartModel.js';
import Product from '../../model/productModel.js';
import Wishlist from '../../model/wishlistModel.js';


// Retrieve only 'name', 'brand' etc from 'Cart' for 'display' it
export const getCartPopulatedForDisplay = async (userId) => {
    return await Cart.findOne({ user: userId })                         // Here we 'finding' 'first' matching document based on '{ user: userId }' 
        .populate({    
            path: 'items.product',                                      // 'path' built-in keyword of 'mongoose' put inside 'populate()' and its value is 'items.product'(ie in 'Cart' model, 'product' field refers in 'Product' model and in 'cart' document has 'items' named 'array' and it tells look at every single object inside 'items' array and find the 'productId').
            select: 'name brand isListed totalStock variants discount'
        })
        .lean();
};

// Retrieve 'single' product based on 'productId' and 'isListed: true'
export const getActiveProductById = async (productId) => {
    return await Product.findOne({ _id: productId, isListed: true });
};

// Retrieve single 'cart' based on 'userId'
export const getCartDocument = async (userId) => {
    return await Cart.findOne({ user: userId });
};

// For create 'new' document based on 'userId' with 'items' array as 'initial value'. 
export const createEmptyCart = async (userId) => {
    const cart = new Cart({ user: userId, items: [] });           //  Here new Cart create new document based on userId, then 'items' array firstly created in 'cart' object/document because of 'items: [](ie 'mongoose' automatically understand 'items: []' is the initial value of 'new' document).
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
            await Wishlist.findOneAndUpdate(                    //  Here find one 'wishlist' document based on 'userId' and 'pull' or 'delete' 'product' array(ie it is an array created in 'wishlist' model) based on 'productId'
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
