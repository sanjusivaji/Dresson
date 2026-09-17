import * as adminOrderRepository from '../../repository/admin/adminOrderRepository.js';
import { ORDER_STATUSES, RETURN_ACTIONS, RETURN_STATUSES } from '../../constants/orderConstants.js';
import {USER_ORDER_CONSTANTS} from '../../constants/userOrderConstants.js'
import razorpayInstance from '../../config/razorpay.js';


// Gets a specific page of orders using search filters
export const getOrdersPaginated = async (page, limit, filters) => {
    const skip = (page - 1) * limit;
    let query = {};
    if (filters.search) {
        query.$or = [                                                                                // Searches by order ID or customer name
            { orderId: { $regex: filters.search, $options: 'i' } },
            { "shippingAddress.fullName": { $regex: filters.search, $options: 'i' } }
        ];
    }
    if (filters.status) query.deliveryStatus = filters.status;
    if (filters.payment) query.paymentMethod = filters.payment;    
    if (filters.date) {
        const now = new Date();
        if (filters.date === 'today') query.createdAt = { $gte: new Date(now.setHours(0, 0, 0, 0)) }; // Finds orders from today starting at midnight
        else if (filters.date === 'week') query.createdAt = { $gte: new Date(now.setDate(now.getDate() - 7)) };
        else if (filters.date === 'month') query.createdAt = { $gte: new Date(now.setMonth(now.getMonth() - 1)) };
    }
    const orders = await adminOrderRepository.findOrders(query, skip, limit);
    const totalOrders = await adminOrderRepository.countOrders(query);
    const formattedOrders = orders.map(item => {      
        const dateObj = new Date(item.createdAt);
        const formattedDate = dateObj.toLocaleDateString('en-GB', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        }).replace(/\//g, '-');                                                                      // Changes slashes to dashes in the date format
        return { ...item, formattedDate };
    });
    return {
        orders: formattedOrders,
        totalPages: Math.ceil(totalOrders / limit) || 1
    };
};


// Gets order info and formats its creation date
export const getOrderDetails = async (orderId) => {
    const order = await adminOrderRepository.findOrderDetailsById(orderId);
    if (!order) return null;
    const formattedDate = new Date(order.createdAt).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric'
    });
    return { order, formattedDate };
};


// Changes the delivery status of an order
export const updateStatus = async (orderId, newStatus) => {
    if (!ORDER_STATUSES.VALID_STATUSES.includes(newStatus)) {
        throw new Error("Invalid status selected.");
    }
    await adminOrderRepository.updateOrderDeliveryStatus(orderId, newStatus);
};


// Gets a page of return requests with search and filters applied
export const getReturnsPaginated = async (page, limit, filters) => {
    const skip = (page - 1) * limit;
    let query = { 
        $or: [
            { "returnRequest.isRequested": true },
            { "items.itemStatus": { $in: ['Return Pending', 'Returned', 'Return Rejected'] } }
        ]
    };   
    if (filters.search) {
        query.$and = [
            {
                $or: [
                    { orderId: { $regex: filters.search, $options: 'i' } },
                    { "shippingAddress.fullName": { $regex: filters.search, $options: 'i' } }
                ]
            }
        ];
    }
    if (filters.status) {
        if (filters.status === 'Pending') {
            query.$or = [{ "returnRequest.status": 'Pending' }, { "items.itemStatus": 'Return Pending' }];
        } else if (filters.status === 'Approved' || filters.status === 'Refunded') {
            query.$or = [{ "returnRequest.status": { $in: ['Approved', 'Refunded'] } }, { "items.itemStatus": 'Returned' }];
        } else if (filters.status === 'Rejected') {
            query.$or = [{ "returnRequest.status": 'Rejected' }, { "items.itemStatus": 'Return Rejected' }];
        } else {
            query["returnRequest.status"] = filters.status;
        }
    }    
    const returns = await adminOrderRepository.findReturns(query, skip, limit);              
    const totalReturns = await adminOrderRepository.countOrders(query);                           
    const formattedReturns = returns.map(order => {
        const returningItems = (order.items || []).filter(i => 
            ['Return Pending', 'Returned', 'Return Rejected'].includes(i.itemStatus)
        );        
        const dateObj = returningItems.length > 0 && order.updatedAt ? new Date(order.updatedAt) : (order.returnRequest?.requestedAt ? new Date(order.returnRequest.requestedAt) : new Date(order.updatedAt));
        const requestedDate = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');      
        const returnId = `#RET${order.orderId ? order.orderId.substring(order.orderId.length - 4) : '0000'}`;          
        let productSummary = 'N/A';
        if (returningItems.length > 0) {
            productSummary = returningItems[0].product?.name || returningItems[0].product?.productName || 'Deleted Product';
            if (returningItems.length > 1) productSummary += ` (+${returningItems.length - 1})`;
        } else if (order.items && order.items.length > 0) {
            productSummary = order.items[0].product?.name || order.items[0].product?.productName || 'Deleted Product';
            if (order.items.length > 1) productSummary += ` (+${order.items.length - 1})`;
        }
        return { ...order, returnId, requestedDate, productSummary };                       
    });    
    return {
        returns: formattedReturns,
        totalPages: Math.ceil(totalReturns / limit) || 1
    };
};


// Gets the full details of a specific return
export const getReturnDetails = async (orderId) => {
    const order = await adminOrderRepository.findReturns({ _id: orderId }, 0, 1).then(res => res[0]); 
    if (!order) return null;
    const hasReturningItems = order.items && order.items.some(i => 
        ['Return Pending', 'Returned', 'Return Rejected'].includes(i.itemStatus)
    );
    const isLegacyReturn = order.returnRequest && order.returnRequest.isRequested;
    if (!hasReturningItems && !isLegacyReturn) {
        return null; 
    }    
    const dateObj = order.returnRequest?.requestedAt ? new Date(order.returnRequest.requestedAt) : new Date(order.updatedAt);
    const requestedDate = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    const returnId = `#RET${order.orderId ? order.orderId.substring(order.orderId.length - 4) : '0000'}`;
    return { order, returnId, requestedDate };
};


// Approves or rejects a return, updates stock, and handles refunds
export const processReturn = async (orderId, action, adminMessage) => {
    const order = await adminOrderRepository.findOrderDocumentById(orderId);      
    if (!order) throw new Error('Order not found.');    
    const pendingItems = order.items.filter(i => i.itemStatus === 'Return Pending');   
    if (pendingItems.length === 0 && (!order.returnRequest || !order.returnRequest.isRequested)) {
        throw new Error('No pending return requests found for this order.');
    }        
    if (action === 'Reject' || action === 'REJECT') { 
        pendingItems.forEach(item => {
            item.itemStatus = 'Return Rejected'; 
            item.adminMessage = adminMessage; 
        });
        if (order.returnRequest && order.returnRequest.isRequested) {
            order.returnRequest.status = 'Rejected';
            order.returnRequest.adminMessage = adminMessage;
        }       
    } else if (action === 'Approve' || action === 'APPROVE') {
        let totalRefundForTheseItems = 0;
        for (let item of pendingItems) {
            item.itemStatus = 'Returned'; 
            item.adminMessage = adminMessage; 
            await adminOrderRepository.restoreProductStock(item.product, item.variantSku, item.variantName, item.quantity);            
            const itemEffectivePrice = item.effectivePrice !== undefined ? item.effectivePrice : item.price;
            const itemBaseTotal = itemEffectivePrice * item.quantity;
            const itemTax = (itemBaseTotal * (item.taxRate || 0)) / 100;
            totalRefundForTheseItems += (itemBaseTotal + itemTax);
        }
        if (order.returnRequest && order.returnRequest.isRequested) {
            order.returnRequest.status = 'Refunded';
            order.returnRequest.adminMessage = adminMessage;
        }        
        const flatReturnFee = (typeof USER_ORDER_CONSTANTS !== 'undefined' && USER_ORDER_CONSTANTS.PICKUP_COST) 
            ? USER_ORDER_CONSTANTS.PICKUP_COST   : 150; 
        let refundAmount = totalRefundForTheseItems;
        if (refundAmount > flatReturnFee) {
            refundAmount -= flatReturnFee;
        } else {
            refundAmount = 0;                                                                        // Prevents the refund from becoming a negative number
        }
        if (refundAmount > 0) {            
            let paymentIdToRefund = order.razorpayPaymentId || order.paymentId || order.transactionId; 
            let razorpayRefundSuccess = false;
            if (!paymentIdToRefund && (order.paymentMethod === 'Razorpay' || order.paymentMethod === 'Credit Card') && order.razorpayOrderId) {
                try {
                    const payments = await razorpayInstance.orders.fetchPayments(order.razorpayOrderId);
                    const capturedPayment = payments.items.find(item => item.status === 'captured');
                    if (capturedPayment) {
                        paymentIdToRefund = capturedPayment.id;
                        order.razorpayPaymentId = capturedPayment.id; 
                    }
                } catch (fetchError) {
                    console.error("Could not dynamically fetch Razorpay payment ID:", fetchError);
                }
            }
            if ((order.paymentMethod === 'Razorpay' || order.paymentMethod === 'Credit Card') && paymentIdToRefund) {
                try {
                    await razorpayInstance.payments.refund(paymentIdToRefund, {
                        amount: Math.round(refundAmount * 100), 
                        notes: { reason: 'Admin Approved Return', orderId: order._id.toString() }
                    });
                    razorpayRefundSuccess = true;
                } catch (error) {
                    console.error("Razorpay refund failed or ID invalid. Falling back to wallet.", error);
                    razorpayRefundSuccess = false; 
                }
            }
            if (!razorpayRefundSuccess) {
                const user = await adminOrderRepository.findUserById(order.user);                                          
                user.walletBalance += refundAmount;
                await user.save();
                const uniqueTxId = 'TX-' + Date.now().toString().slice(-6) + Math.floor(100 + Math.random() * 900);
                await adminOrderRepository.createRefundTransaction({
                    user: order.user,
                    transactionId: uniqueTxId,
                    orderId: order._id,
                    amount: refundAmount,
                    type: 'Credit',
                    adjustmentType: 'Refund',
                    reason: `Refund for Approved Return (Minus ₹${flatReturnFee} Pickup Fee).`,
                    gateway: 'Wallet', 
                    status: 'Success',
                    balanceAfter: user.walletBalance
                });
            }
        }
        order.totalAmount = Math.max(0, order.totalAmount - totalRefundForTheseItems);
        const activeItems = order.items.filter(item => item.itemStatus !== 'Cancelled' && item.itemStatus !== 'Returned');
        if (activeItems.length === 0) {
            order.deliveryStatus = 'Returned';
            order.paymentStatus = 'Refunded';
        }
    }    
    order.markModified('items');
    await order.save();
    return action;
};