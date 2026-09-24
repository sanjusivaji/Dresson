import * as userOrderRepository from '../../repository/user/userOrderRepository.js';
import { USER_ORDER_CONSTANTS, ORDER_STATUS, PAYMENT_STATUS, RETURN_STATUS } from '../../constants/userOrderConstants.js';
import ejs from 'ejs';
import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Finds a user's orders and groups them into pages based on their search and status filters
export const getUserOrdersPaginated = async (userId, page, filters) => {
    const limit = USER_ORDER_CONSTANTS.PAGINATION_LIMIT;
    const skip = (page - 1) * limit;
    let query = { user: userId };
    if (filters.status) query.deliveryStatus = filters.status;
    if (filters.search) {
        const matchingProducts = await userOrderRepository.findMatchingProducts(filters.search);
        const productIds = matchingProducts.map(item => item._id);
        query.$or = [
            { orderId: { $regex: filters.search, $options: 'i' } },
            { 'items.product': { $in: productIds } }
        ];
    }
    const orders = await userOrderRepository.findUserOrders(query, skip, limit);
    const totalOrders = await userOrderRepository.countUserOrders(query);
    return { 
        orders, 
        totalPages: Math.ceil(totalOrders / limit) || 1 
    };
};


// Gets order details and calculates the current active totals by working backward from the database
export const getOrderDetails = async (orderId, userId) => {
    const order = await userOrderRepository.findOrderById(orderId, userId, { path: 'items.product', select: 'name images variants' });
    if (!order) return null;
    const formattedDate = new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });    
    let subTotal = 0;
    let totalTax = 0;
    const activeItems = order.items.filter(i => i.itemStatus !== 'Cancelled' && i.itemStatus !== 'Returned');    
    activeItems.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subTotal += itemTotal;
        totalTax += (itemTotal * (item.taxRate || 0)) / 100;
    });    
    const discount = order.discountAmount || 0;
    let shipping = order.totalAmount - subTotal - totalTax + discount;
    shipping = Math.max(0, Math.round(shipping * 100) / 100);
    return { 
        order, 
        formattedDate, 
        summary: { subTotal, tax: totalTax, shipping, discount, grandTotal: order.totalAmount } 
    };
};


// Cancels an entire order, puts items back in stock, and refunds the user's wallet
export const cancelOrder = async (orderId, userId) => {
    const order = await userOrderRepository.findOrderIdAndUserId(orderId, userId);
    if (!order) throw new Error("Order not found.");    
    if (order.deliveryStatus === ORDER_STATUS.DELIVERED || order.deliveryStatus === ORDER_STATUS.CANCELLED) {
        return false; 
    }    
    for (let item of order.items) {
        await userOrderRepository.restoreProductStock(item.product, item.variantSku, item.quantity);
    }    
    let refundAmount = order.totalAmount;
    let refundReason = `Refund for Cancelled Order #${order.orderId}`;
    const standardShippingFee = USER_ORDER_CONSTANTS.SHIPPING_COST;
    if (['Shipped', 'Out for Delivery'].includes(order.deliveryStatus)) {
        if (order.totalAmount > standardShippingFee) {
            refundAmount = order.totalAmount - standardShippingFee;
            refundReason = `Late Cancellation Refund #${order.orderId} (Minus ₹${standardShippingFee} Logistics Fee)`;
        }
    }
    order.deliveryStatus = ORDER_STATUS.CANCELLED;
    if (order.paymentStatus === PAYMENT_STATUS.PAID) {                                                         
        order.paymentStatus = PAYMENT_STATUS.REFUNDED;
        const user = await userOrderRepository.findUserById(userId);
        user.walletBalance += refundAmount;
        await user.save();      
        const uniqueTxId = 'TX-' + Date.now().toString().slice(-6) + Math.floor(100 + Math.random() * 900);
        await userOrderRepository.createRefundTransaction({
            user: userId,
            transactionId: uniqueTxId,
            orderId: order._id,
            amount: refundAmount,
            type: 'Credit',
            adjustmentType: 'Refund',
            reason: refundReason,
            gateway: 'Wallet',                                                 
            status: 'Success',
            balanceAfter: user.walletBalance
        });
    }    
    await order.save();
    return true;
};


// Cancels or returns a single item from an order instead of the whole thing
export const handleItemAction = async (orderId, itemId, userId, actionType, reason) => {
    const order = await userOrderRepository.findOrderIdAndUserId(orderId, userId);
    if (!order) throw new Error("Order not found.");   
    const item = order.items.find(i => 
        (i._id && i._id.toString() === itemId.toString()) || 
        (i.product && i.product.toString() === itemId.toString())
    );
    if (!item || item.itemStatus === 'Cancelled' || item.itemStatus === 'Returned') {
        throw new Error("Item cannot be modified.");
    }
    if (actionType === 'Cancel') {
        let itemsToCancel = [item];
        if (item.comboId) {
            const partnerItems = order.items.filter(i => 
                i.comboId === item.comboId && 
                i._id.toString() !== item._id.toString() &&
                i.itemStatus !== 'Cancelled'
            );
            itemsToCancel = itemsToCancel.concat(partnerItems);
        }
        let totalRefundForTheseItems = 0;
        for (let cancelItem of itemsToCancel) {
            cancelItem.itemStatus = 'Cancelled';
            cancelItem.cancellationReason = cancelItem._id.toString() === item._id.toString() 
                ? reason 
                : 'Auto-cancelled: Partner item in combo was cancelled.';
            await userOrderRepository.restoreProductStock(cancelItem.product, cancelItem.variantSku, cancelItem.quantity);
            const itemBaseTotal = cancelItem.price * cancelItem.quantity;
            const itemTax = (itemBaseTotal * (cancelItem.taxRate || 0)) / 100;
            totalRefundForTheseItems += (itemBaseTotal + itemTax);
        }
        if (order.paymentStatus === PAYMENT_STATUS.PAID && totalRefundForTheseItems > 0) {
            if (['Shipped', 'Out for Delivery'].includes(order.deliveryStatus)) {
                const safeShippingCost = (typeof USER_ORDER_CONSTANTS !== 'undefined' && USER_ORDER_CONSTANTS.SHIPPING_COST) ? USER_ORDER_CONSTANTS.SHIPPING_COST : 150;
                if (totalRefundForTheseItems > safeShippingCost) {
                    totalRefundForTheseItems -= safeShippingCost;
                }
            }
            const user = await userOrderRepository.findUserById(userId);
            user.walletBalance += totalRefundForTheseItems;
            await user.save();
            const uniqueTxId = 'TX-' + Date.now().toString().slice(-6) + Math.floor(100 + Math.random() * 900);
            await userOrderRepository.createRefundTransaction({
                user: userId,
                transactionId: uniqueTxId,
                orderId: order._id,
                amount: totalRefundForTheseItems,
                type: 'Credit',
                adjustmentType: 'Refund',
                reason: `Refund for Cancelled Item(s).`,
                gateway: order.paymentMethod || 'Wallet',
                status: 'Success',
                balanceAfter: user.walletBalance
            });
        }
        order.totalAmount = Math.max(0, order.totalAmount - totalRefundForTheseItems);        
    } else if (actionType === 'Return') {
        item.itemStatus = 'Return Pending';
        item.returnReason = reason;      
        order.markModified('items');
        await order.save();
        return true; 
    }
    const allCancelled = order.items.every(i => i.itemStatus === 'Cancelled');
    if (allCancelled) {
        order.deliveryStatus = ORDER_STATUS.CANCELLED;
        if (order.paymentStatus === PAYMENT_STATUS.PAID) order.paymentStatus = PAYMENT_STATUS.REFUNDED;
    }        
    order.markModified('items'); 
    await order.save();
    return true;
};


// Builds the visual invoice document and converts it into a downloadable PDF
export const generateInvoicePdf = async (orderId, userId) => {
    const order = await userOrderRepository.findOrderById(orderId, userId, { path: 'items.product', select: 'productName name' });
    if (!order) throw new Error("Order not found");  
    const invoiceDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const orderDate = new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });        
    let subTotal = 0;
    let taxTotal = 0;    
    const activeItems = order.items.filter(item => item.itemStatus !== 'Cancelled' && item.itemStatus !== 'Returned');
    const itemsWithTax = activeItems.map(item => {
        const taxRate = item.taxRate || USER_ORDER_CONSTANTS.DEFAULT_TAX_RATE;
        const amount = item.price * item.quantity;
        const taxAmount = (amount * taxRate) / 100;    
        subTotal += amount;
        taxTotal += taxAmount;        
        return { ...item, taxRate, taxAmount, amount };
    });
    let shipping = USER_ORDER_CONSTANTS.SHIPPING_COST || 150;
    if ((subTotal + taxTotal) >= 1500) {
        shipping = 0;
    }
    const discount = order.discountAmount || 0;    
    const invoiceData = {
        order, items: itemsWithTax, invoiceDate, orderDate, subTotal, taxTotal, shipping, discount, grandTotal: order.totalAmount
    };   
    const templatePath = path.join(__dirname, '../../../view/user/invoiceTemplate.ejs');                                       // For args array to bypass the AWS EC2 Linux sandbox
    const html = await ejs.renderFile(templatePath, invoiceData);
    const browser = await puppeteer.launch({ 
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        ]
    });
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' } });
    await browser.close();
    return { pdfBuffer, orderId: order.orderId };
};


// Sets up the information needed for the return confirmation page
export const getReturnDetails = async (orderId, userId) => {
    const order = await userOrderRepository.findOrderById(orderId, userId, { path: 'items.product', select: 'productName name images' });
    if (!order) return null;
    const pickUpDateObj = new Date();
    pickUpDateObj.setDate(pickUpDateObj.getDate() + 3);
    const formattedPickUpDate = pickUpDateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    return { order, pickUpDate: formattedPickUpDate };
};


// Sends a request to the admin to return an entire order
export const processReturnRequest = async (orderId, userId, reason) => {
    if (!reason) throw new Error("A return reason is mandatory.");
    const order = await userOrderRepository.findOrderIdAndUserId(orderId, userId);
    if (!order || order.deliveryStatus !== ORDER_STATUS.DELIVERED) {
        throw new Error("Invalid return request.");
    }
    order.returnRequest = {
        isRequested: true,
        reason: reason,
        status: RETURN_STATUS.PENDING,
        requestedAt: new Date()
    };
    await order.save();
};