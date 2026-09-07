import Cart from '../../model/cartModel.js';
import Coupon from '../../model/couponModel.js';
import Order from '../../model/orderModel.js';
import User from '../../model/userModel.js';
import WalletTransaction from '../../model/walletTransactions.js';
import Product from '../../model/productModel.js';
import Offer from '../../model/offerModel.js';


// Retrieve 'only' 'active' 'coupon' based on 'currentDate'
export const findActiveCoupons = async (currentDate) => {
    return await Coupon.find({
        isActive: true,
        validFrom: { $lte: currentDate },
        validTill: { $gte: currentDate }
    }).lean();
};

// Retrieve 'coupon' details based on 'couponCode'(Eg,'WELCOME50')
export const findCouponByCode = async (couponCode) => {
    return await Coupon.findOne({ couponCode: couponCode.toUpperCase() });
};

// Retrieve 'coupon' details based on 'couponId'(ie 'couponId' created 'mongodb' only after using 'coupon' and it is faster than 'string')
export const findCouponById = async (couponId) => {
    return await Coupon.findById(couponId);
};

// For 'save' the 'modified' 'coupon document' in 'coupon' collection(ie 'couponDoc' contains all data about 'coupon' collection as 'metadata')
export const saveCouponDocument = async (couponDoc) => {
    return await couponDoc.save();                          // In above 'findCouponById()', 'findById' return 'mongoose object'(ie 'couponDoc') contains all data(ie as 'metadata) about 'collection', so here we 'donot' need mention 'collection' name.       
};

// For 'save' 'cart' document in 'cart' collection
export const saveCartDocument = async (cartDoc) => {
    return await cartDoc.save();
};


// Retrieve first matching 'cart' document based on 'userId'
export const findCartByUserIdDoc = async (userId) => {
    return await Cart.findOne({ user: userId });          // It retrieve all 'cart' data include 'coupon' data because we put 'appliedCoupon', 'discountAmount' like fields in cart model.
};

// For creates a new 'document' in 'order' collection based on 'orderData'
export const createOrder = async (orderData) => {
    return await Order.create(orderData);              // 'create()' creates a new 'document' in 'order' collection based on 'orderData'('orderData' contains fields like 'appliedCoupon', 'discount', 'userId','orderId','paymentMethod', 'status' etc)and we 'retrieve' all these data in 'findOrderByIdDoc()' in below.
};

// Retrieve 'order' data based on 'orderId'.
export const findOrderByIdDoc = async (orderId) => {
    return await Order.findById(orderId);
};

// Retrieve 'order' data based on 'orderId' and 'lean' only for 'display' it.
export const findOrderByIdLean = async (orderId) => {
    return await Order.findById(orderId).lean();
};

// For creates a new 'document' in 'walletTransaction' collection based on 'transactionData'
export const logWalletTransaction = async (transactionData) => {
    return await WalletTransaction.create(transactionData);
};

// For 'reduce' the 'quantity' of  exact variant from the product array
export const deductProductStock = async (productId, sku, quantity) => {
    return await Product.updateOne(
        { _id: productId, "variants.sku": sku },          // For 'filter' based on 'productId' and 'sku' 
        { $inc: { "variants.$.stock": -quantity } }       // For 'reduce' (ie because of '-quantity' in '$inc')the "variants.$.stock"(ie '$' act as 'place holder' represents 'index' of product based on filter 'sku' or 'productId' ) 
    );
};

// For 'emptying' 'cart' by 'userId'(uses in 'checkout' time)
export const clearCartByUserId = async (userId) => {
    return await Cart.findOneAndUpdate({ user: userId },  // It is 'filter'
                                      { $set: { items: [], appliedCoupon: null, discountAmount: 0 } }); // '$set' used for 'replace' old value ie 'items' contains 'products' data we make it 'empty' array and also 'appliedCoupon' and 'discountAmount' make 'empty'.
};

// Retrieve 'User' data based on 'userId'
export const findUserByIdDoc = async (userId) => {
    return await User.findById(userId);
};


export const getActiveFreeShippingOffer = async () => {
    const currentDate = new Date();
    return await Offer.findOne({
        type: 'Free Shipping',
        isManuallyActive: true,
        startDate: { $lte: currentDate },
        endDate: { $gte: currentDate }
    }).lean();
};