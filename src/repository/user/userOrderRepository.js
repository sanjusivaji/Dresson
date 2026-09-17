import Order from '../../model/orderModel.js';
import Product from '../../model/productModel.js';
import User from '../../model/userModel.js'
import Transaction from '../../model/walletTransactions.js';


// Looks up a specific order and also pulls in information about the products inside it
export const findOrderById = async (orderId, userId, populateOptions) => {
    return await Order.findOne({ _id: orderId, user: userId })
        .populate(populateOptions)                                          // Merges the basic order data with the specific details from the Product database, like the product's name and images 
        .lean();                                                            // Cleans up the data so it's a simple Javascript object and easier to read 
};


// Finds a specific user's basic account data
export const findUserById = async(userId) => {
    return await User.findById(userId);
}


// Searches for products that match the text a user typed in
export const findMatchingProducts = async (searchQuery) => {
    return await Product.find({
        name: { $regex: searchQuery, $options: 'i' }
    }).select('_id');
};


// Gets a list of orders for the user, sorting the newest ones to the top
export const findUserOrders = async (query, skip, limit) => {
    return await Order.find(query)
        .populate('items.product', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
};


// Counts how many orders a user has in total
export const countUserOrders = async (query) => {
    return await Order.countDocuments(query);
};


// Finds a specific order while making sure it belongs to the exact user who asked for it
export const findOrderIdAndUserId = async (orderId, userId) => {
    return await Order.findOne({ _id: orderId, user: userId }); 
};


// Adds canceled or returned items back to the store's inventory
export const restoreProductStock = async (productId, variantSku, variantName, quantity) => {
    const qtyToAdd = Number(quantity) || 1;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(variantSku);
    const variantMatch = isObjectId 
        ? { _id: variantSku } 
        : { $or: [{ sku: variantSku }, { variantName: variantName }] };
    return await Product.updateOne(
        { 
            _id: productId, 
            "variants": { $elemMatch: variantMatch } 
        },          
        { 
            $inc: { 
                "variants.$.stock": qtyToAdd, 
                "totalStock": qtyToAdd        
            } 
        }       
    );
};


// Looks up an order and pulls in all the details about the coupon that was used on it
export const findOrderWithCoupon = async (orderId) => {
    return await Order.findById(orderId).populate('appliedCoupon');
};


// Saves a history record of a wallet refund to the database
export const createRefundTransaction = async (transactionData) => {
    return await Transaction.create(transactionData);                                                                         // Tells the database to build and save the new transaction record instantly
};