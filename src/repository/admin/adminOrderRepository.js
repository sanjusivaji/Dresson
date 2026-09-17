import Order from '../../model/orderModel.js';
import Product from '../../model/productModel.js';
import User from '../../model/userModel.js';
import WalletTransaction from '../../model/walletTransactions.js'; 
import Coupon from '../../model/couponModel.js'


// Finds orders and attaches the user's name and email to them
export const findOrders = async (query, skip, limit) => {
    return await Order.find(query)
        .populate('user', 'email name')                                                              // Pulls just the email and name from the user profile
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
};


// Counts how many orders match our search
export const countOrders = async (query) => {
    return await Order.countDocuments(query);
};


// Gets full order details including user and product info
export const findOrderDetailsById  = async (orderId) => {         
    return await Order.findById(orderId)
        .populate({
            path: 'user',
            select: 'firstName lastName email'
        })
        .populate({                                                                                  // Pulls product details and looks up its specific category name
            path: 'items.product',
            select: 'name images subCategory', 
            populate: {
                path: 'subCategory',         
                select: 'categoryName'       
            }
        });
};


// Updates the delivery status of a specific order
export const updateOrderDeliveryStatus = async (orderId, newStatus) => {
    return await Order.findByIdAndUpdate(orderId, { deliveryStatus: newStatus });
};


// Finds returned orders and sorts them from newest to oldest
export const findReturns = async (query, skip, limit) => {
    return await Order.find(query)
        .populate('user', 'email name')
        .populate('items.product', 'name productName images')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
};


// Gets the raw order document by its ID
export const findOrderDocumentById = async (orderId) => {
    return await Order.findById(orderId);
};


// Adds returned items back into the product stock
export const restoreProductStock = async (productId, variantSku, variantName, returnQuantity) => {
    return await Product.updateOne(
        { 
            _id: productId, 
            "variants": { 
                $elemMatch: { 
                    sku: variantSku, 
                    name: variantName
                } 
            } 
        },
        { 
            $inc: { 
                "variants.$.stock": returnQuantity,
                "totalStock": returnQuantity        
            } 
        }
    );
};


// Finds a user by their ID
export const findUserById = async (userId) => {
    return await User.findById(userId);
};


// Creates a record for a wallet refund transaction
export const createRefundTransaction = async (transactionData) => {
    const transaction = new WalletTransaction(transactionData);
    return await transaction.save();
};


// Attaches coupon details to an order
export const populateOrderCoupon = async (orderDoc) => {
    return await Coupon.populate(orderDoc, { path: 'appliedCoupon' });
};