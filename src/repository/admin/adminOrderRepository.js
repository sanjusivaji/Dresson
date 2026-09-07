import Order from '../../model/orderModel.js';


// Here we populating in 'User' model from 'Order' model and retrieve 'name' and 'email' under 'User' 
export const findOrders = async (query, skip, limit) => {
    return await Order.find(query)
        .populate('user', 'email name')                        // Here we retrieve data of 'user' from 'user' model and here we use 'shortcut' for 'select' return 'fields' ie after 'population' we need only 'name' and 'email' fields and we can also write it like '.populate('path: user', 'select:email name')'. 
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
};

// Retrieve number of 'orders' based on 'query'
export const countOrders = async (query) => {
    return await Order.countDocuments(query);
};

// Retrieve order data and 'name' and 'email' from 'user' model and 'name', 'images','category' from 'items.product'
export const findOrderDetailsById  = async (orderId) => {         // In this function we retrieve all data of 'Order' model and also retrieve data like 'name' and 'email' of 'User' by using 'populate'. 
    return await Order.findById(orderId)
        .populate({
            path: 'user',
            select: 'firstName lastName email'
        })
        .populate({                                              // In 'second' 'population' we retrieve 'items.product' data from 'Product' model(ie only 'name', 'images', 'subCategory' etc fields)and we 'populated' again 'inside' 'items.product' ie 'retrieve data from 'subCategory' field that is in 'Category' model and we get the name of category as 'categoryName' with all data of 'Orders' model.
            path: 'items.product',
            select: 'name images subCategory', 
            populate: {
                path: 'subCategory',         
                select: 'categoryName'       
            }
        });
};

// For 'find' the 'order' by 'orderId' and 'update' the 'deliveryStatus' with value 'newStatus
export const updateOrderDeliveryStatus = async (orderId, newStatus) => {
    return await Order.findByIdAndUpdate(orderId, { deliveryStatus: newStatus }); // For 'find' the 'order' by 'orderId' and 'update' the 'deliveryStatus' with value 'newStatus' and currently it 'return' 'previous status' but if we want to 'return' 'new'(ie 'changed')status we should use '{new:true}' or '{document: after}'(ie 'return await Order.findByIdAndUpdate(orderId, { deliveryStatus: newStatus }, { document:after })')  
};

// For retrieve 'order' details and 'sort' the data 'new to old' 
export const findReturns = async (query, skip, limit) => {
    return await Order.find(query)
        .populate('user', 'email name')
        .populate('items.product', 'name productName images')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
};

// Retrieve all 'Order' data only based on 'orderId'
export const findOrderDocumentById = async (orderId) => {
    return await Order.findById(orderId);
};