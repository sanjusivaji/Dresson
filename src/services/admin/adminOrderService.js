import * as adminOrderRepository from '../../repository/admin/adminOrderRepository.js';
import { ORDER_STATUSES, RETURN_ACTIONS, RETURN_STATUSES } from '../../constants/orderConstants.js';


// For 'pagination' and 'dynamic filtering' 
export const getOrdersPaginated = async (page, limit, filters) => {
    const skip = (page - 1) * limit;
    let query = {};
    if (filters.search) {
        query.$or = [                                                                                  // Here we add a '$or' operator with 'query' object dynamically and then we can check 'two' conditions ie  'filters.search' means 'search' query send from user and if it is  matches with 'orderId'(ie it created during 'checkout' service)that 'query'(ie 'filter') will send with 'query' object and if it is 'name' and matches with "shippingAddress.fullName' 'query'/filter will send with 'query' object to 'database' 
            { orderId: { $regex: filters.search, $options: 'i' } },
            { "shippingAddress.fullName": { $regex: filters.search, $options: 'i' } }
        ];
    }
    if (filters.status) query.deliveryStatus = filters.status;
    if (filters.payment) query.paymentMethod = filters.payment;    
    if (filters.date) {
        const now = new Date();
        if (filters.date === 'today') query.createdAt = { $gte: new Date(now.setHours(0, 0, 0, 0)) }; // Here we check if the 'filters.date' value is equal to 'today' and if it is 'true', we add a 'new' property(ie 'createdAt')into the 'query' object and its value tells MongoDB to find orders where the time is 'greater than or equal to'(ie '$gte') 'midnight'(ie '12am' ie '0, 0, 0, 0' ie 'hours', 'minutes', 'seconds', 'milliseconds') of the current day.
        else if (filters.date === 'week') query.createdAt = { $gte: new Date(now.setDate(now.getDate() - 7)) };
        else if (filters.date === 'month') query.createdAt = { $gte: new Date(now.setMonth(now.getMonth() - 1)) };
    }
    const orders = await adminOrderRepository.findOrders(query, skip, limit);                        // Here we retrieve all 'order' data and also populating in 'User' model from 'Order' model and retrieve only 'name' and 'email' under 'User'
    const totalOrders = await adminOrderRepository.countOrders(query);                               // Retrieve number of 'orders' based on 'query'
    const formattedOrders = orders.map(item => {      
        const dateObj = new Date(item.createdAt);                                                    // Created a 'date object' based on 'item.createdAt'
        const formattedDate = dateObj.toLocaleDateString('en-GB', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        }).replace(/\//g, '-');                                                                      // Here '\/'(ie '/')replaced with '-' in 'formattedDate'.
        return { ...item, formattedDate };
    });
    return {
        orders: formattedOrders,
        totalPages: Math.ceil(totalOrders / limit) || 1
    };
};


// For retrieve 'order' data and create 'date'
export const getOrderDetails = async (orderId) => {
    const order = await adminOrderRepository.findOrderDetailsById(orderId);                      // Retrieve order data and 'name' and 'email' from 'user' model and 'name', 'images','category' from 'items.product'
    if (!order) return null;
    const formattedDate = new Date(order.createdAt).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric'
    });
    return { order, formattedDate };
};

// For 'update' 'deleiveryStatus' of 'order' 
export const updateStatus = async (orderId, newStatus) => {
    if (!ORDER_STATUSES.VALID_STATUSES.includes(newStatus)) {
        throw new Error("Invalid status selected.");
    }
    await adminOrderRepository.updateOrderDeliveryStatus(orderId, newStatus);                 // For 'find' the 'order' by 'orderId' and 'update' the 'deliveryStatus' with value 'newStatus
};


// For retrieve 'order' data only that 'return' initiated and also return 'product' data with 'date' and 'total pages' for 'pagination'   
export const getReturnsPaginated = async (page, limit, filters) => {
    const skip = (page - 1) * limit;
    let query = { "returnRequest.isRequested": true };
    if (filters.search) {
        query.$or = [
            { orderId: { $regex: filters.search, $options: 'i' } },
            { "shippingAddress.fullName": { $regex: filters.search, $options: 'i' } }
        ];
    }
    if (filters.status) query["returnRequest.status"] = filters.status;
    const returns = await adminOrderRepository.findReturns(query, skip, limit);              // For retrieve 'order' details and 'sort' the data 'new to old' 
    const totalReturns = await adminOrderRepository.countOrders(query);                      // Retrieve number of 'orders' based on 'query'
    const formattedReturns = returns.map(order => {
        const dateObj = order.returnRequest.requestedAt ? new Date(order.returnRequest.requestedAt) : new Date(order.updatedAt);
        const requestedDate = dateObj.toLocaleDateString('en-GB', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        }).replace(/\//g, '-');
        const returnId = `#RET${order.orderId ? order.orderId.substring(order.orderId.length - 4) : '0000'}`;  // Here we create a 'returnId' start with '#RET' and 'substring()' is the 'string' method 'substring(startIndex, endIndex)' is the 'syntax'(but 'endIndex' is 'optional' and here we do 'not' use 'endIndex')ie if 'order.orderId.length' is '8' then 'order.orderId.substring(order.orderId.length - 4)' ie 'order.orderId.substring(8-4)'(ie it 'start' with '4th' character and if length is '12' it start from '8th' character).   
        let productSummary = 'N/A';
        if (order.items && order.items.length > 0 && order.items[0].product) {
            productSummary = order.items[0].product.name || 'Product';
            if (order.items.length > 1) productSummary += ` (+${order.items.length - 1})`;  // ie 'productSummary' contains 'product name' and here we accumulate 'no.of' product only when 'order.items.length > 0' and each iteration after adding value into 'productSummary' it reduces '1' value(ie ' ` (+${order.items.length - 1})`)
        }
        return { ...order, returnId, requestedDate, productSummary };                       // Here before 'return' we adding 'returnId', 'productSummary' etc into 'item' by '...'
    });
    return {
        returns: formattedReturns,
        totalPages: Math.ceil(totalReturns / limit) || 1
    };
};


// For 'order return' details in sorted order(ie 'new to old')with 'requested date' and 'returnId'
export const getReturnDetails = async (orderId) => {
    const order = await adminOrderRepository.findReturns({ _id: orderId }, 0, 1).then(res => res[0]); // It retrieve 'order' details and 'sort' the data 'new to old'    
    if (!order || !order.returnRequest || !order.returnRequest.isRequested) {
        return null;
    }
    const dateObj = order.returnRequest.requestedAt ? new Date(order.returnRequest.requestedAt) : new Date(order.updatedAt);
    const requestedDate = dateObj.toLocaleDateString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    }).replace(/\//g, '-');
    const returnId = `#RET${order.orderId ? order.orderId.substring(order.orderId.length - 4) : '0000'}`;
    return { order, returnId, requestedDate };
};


// For 'process' of return product
export const processReturn = async (orderId, action, adminMessage) => {
    const order = await adminOrderRepository.findOrderDocumentById(orderId);      // Retrieve all 'Order' data only based on 'orderId'
    if (!order || !order.returnRequest || !order.returnRequest.isRequested) {
        throw new Error('Invalid return request.');
    }
    if (order.returnRequest.status !== RETURN_STATUSES.PENDING) {
        throw new Error('This return has already been processed.');
    }
    order.returnRequest.adminMessage = adminMessage;
    if (action === RETURN_ACTIONS.REJECT) {
        order.returnRequest.status = RETURN_STATUSES.REJECTED;
    } else if (action === RETURN_ACTIONS.APPROVE) {
        order.returnRequest.status = RETURN_STATUSES.REFUNDED;
        order.deliveryStatus = 'Returned'; 
    }
    await order.save();
    return action;
};