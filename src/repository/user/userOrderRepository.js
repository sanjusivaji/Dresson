import Order from '../../model/orderModel.js';
import Product from '../../model/productModel.js';
import User from '../../model/userModel.js'
import Transaction from '../../model/walletTransactions.js';


// For retrieve 'name' and 'image' of 'product' based on 'userId' and 'productId'
export const findOrderById = async (orderId, userId, populateOptions) => {
    return await Order.findOne({ _id: orderId, user: userId })
        .populate(populateOptions)                                          // Here value of argument 'populateOptions' is '{path:'items.product', select:'name images'}' and 'path:'items.product', means retrieve data from 'product' collection based on 'product' field(ie it put 'Order' model but connect with 'Product' model ie we also created a 'product' field in 'Product' model and represent by 'ref' field as 'ObjectId') and 'select' retrieve only 'name' and 'images' data 
        .lean();                                                            // Ie here 'function' returns all noramal data in 'order' collection like 'user address' ,'payment method', 'variant details' etc but in 'product' array(ie because 'product' defined as an 'array' in 'Product' model)only contains 'name' and 'image'(ie if we 'not' use 'select' it returns 'category', 'totalStock' etc). 
};

// For retrieve 'user' data based on 'userId'
export const findUserById = async(userId) => {
    return await User.findById(userId);
}

// For retrieve 'all'(because 'find()') 'product' '_id' based on 'searchQuery'
export const findMatchingProducts = async (searchQuery) => {
    return await Product.find({
        name: { $regex: searchQuery, $options: 'i' }
    }).select('_id');
};


// For retrieve 'name' of the 'product' in 'Order' and display as 'descending'(ie 'newest' order first)order
export const findUserOrders = async (query, skip, limit) => {
    return await Order.find(query)
        .populate('items.product', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
};

// For retrieve 'number' of 'orders' based only on 'query'
export const countUserOrders = async (query) => {
    return await Order.countDocuments(query);
};

// For retrieve 'order' details based on 'orderId' and 'userId'
export const findOrderIdAndUserId = async (orderId, userId) => {
    return await Order.findOne({ _id: orderId, user: userId }); 
};

// For 'update' the 'quantity' of product based on 'productId' and 'varaint'
export const restoreProductStock = async (productId, sku, quantity) => {
    return await Product.updateOne(
        { _id: productId, "variants.sku": sku },                   // It is 'filter/condition' ie return 'product' if 'both' conditions satisfies ie 'productId' and 'variant'(ie through 'variant' it will recognize 'size', 'color' like all data Eg,'VAN-VAN-M-AZPV') and both 'productId' and 'sku' are values passes as 'arguments'
        { $inc: { "variants.$.stock": quantity } }                 // Here we just 'update'(ie '$inc' ie if 'quantity' is '1' it 'increase' '1' and if 'quantity' is '-1' it 'decreases') ie if 'quantity' is '5' then it  becomes '{$inc:{"variants.1.stock":5}}'(ie 'mongodb' select '1' 'index' value based on above 'filter' and '$' act as a 'place holder' and value 'stock' is now become '5').
    );
};


// For 'retrieve' order based on 'orderId' and retrieve data of 'appliedCoupon'(ie all data about that particular 'coupon' applied in 'order') from 'Coupon' collection
export const findOrderWithCoupon = async (orderId) => {
    return await Order.findById(orderId).populate('appliedCoupon');
};

// For create a new 'document' in 'Transaction' collection
export const createRefundTransaction = async (transactionData) => {
    return await Transaction.create(transactionData);                  // 'create' is used for ‘create’ new ‘document’ ‘instance’ and ‘automatically’ the ‘document’ save  into the ‘database’ and we can use 'new Transaction(transactionData).save()' instead of it.
};