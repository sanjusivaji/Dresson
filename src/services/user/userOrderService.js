import * as userOrderRepository from '../../repository/user/userOrderRepository.js';
import { USER_ORDER_CONSTANTS, ORDER_STATUS, PAYMENT_STATUS, RETURN_STATUS } from '../../constants/userOrderConstants.js';
import ejs from 'ejs';
import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



// For 'search', 'filter' and 'pagination' based 'query'
export const getUserOrdersPaginated = async (userId, page, filters) => {
    const limit = USER_ORDER_CONSTANTS.PAGINATION_LIMIT;
    const skip = (page - 1) * limit;
    let query = { user: userId };
    if (filters.status) query.deliveryStatus = filters.status;
    if (filters.search) {
        const matchingProducts = await userOrderRepository.findMatchingProducts(filters.search);  // It retrieve all(ie because of 'find()' and return an 'array' like structure) 'product' '_id' based on 'searchQuery'(ie 'product name')
        const productIds = matchingProducts.map(item => item._id);
        query.$or = [                                                                             // Here initial value of 'query' is an 'object'(ie '{user:userId}')and here we 'dynamically' add a 'new property' into it(ie '$or')and then we can check 'filters.search' includes in 'orderId' or any 'productId' 'contains' in 'items.product' array(ie '$in')
            { orderId: { $regex: filters.search, $options: 'i' } },
            { 'items.product': { $in: productIds } }
        ];
    }
    const orders = await userOrderRepository.findUserOrders(query, skip, limit);                 // It retrieve 'name' of the 'product' in 'Order' and display as 'descending'(ie 'newest' order first)order
    const totalOrders = await userOrderRepository.countUserOrders(query);                        // It retrieve 'number' of 'orders' based only on 'query'
    return { 
        orders, 
        totalPages: Math.ceil(totalOrders / limit) || 1 
    };
};


// For 'order' details for 'display' it
export const getOrderDetails = async (orderId, userId) => {
    const order = await userOrderRepository.findOrderById(orderId, userId, { path: 'items.product', select: 'name images' });         // It retrieve 'name' and 'image' of 'product' based on 'userId' and 'productId'
    if (!order) return null;
    const formattedDate = new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });  // Here 'new Date()' is built-in 'js' object used for create a 'date' object and we can 'manipulate'(ie we can manipulate it by using '.getFullYear(), .getMonth(), and .toLocaleDateString()' like methods) and 'en-GB' means 'English Great Britain'(ie it is for 'date formate' like 'Day-Month-Year' format)and 'day: 'numeric'(ie 'day' should be 'number'), ;month: 'long'(ie 'month' should be complete Eg, 'August' and if we use 'short' it will be 'Aug')and 'year: 'numeric' for display year in 'number'.
    let subTotal = 0;
    let totalTax = 0;
    order.items.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subTotal += itemTotal;
        totalTax += (itemTotal * (item.taxRate || 0)) / 100;
    });
    const shipping = USER_ORDER_CONSTANTS.SHIPPING_COST;
    const calculatedTotal = subTotal + totalTax + shipping;
    const discount = calculatedTotal > order.totalAmount ? calculatedTotal - order.totalAmount : 0;
    return { 
        order, 
        formattedDate, 
        summary: { subTotal, tax: totalTax, shipping, discount, grandTotal: order.totalAmount } 
    };
};



// For 'cancel' the order
export const cancelOrder = async (orderId, userId) => {
    const order = await userOrderRepository.findOrderIdAndUserId(orderId, userId);                             // For retrieve 'order' details based on 'orderId' and 'userId'                         
    if (!order) throw new Error("Order not found.");    
    if (order.deliveryStatus === ORDER_STATUS.DELIVERED || order.deliveryStatus === ORDER_STATUS.CANCELLED) {
        return false; 
    }    
    for (let item of order.items) {
        await userOrderRepository.restoreProductStock(item.product, item.variantSku, item.quantity);           // Inside the 'for loop' we 'restore' all products into 'Product' collection, when 'user' 'cancelled' the 'order' ie in 'repository' 'update' the 'quantity' of product based on 'productId','sku' and 'quantity'.     
    }    
    order.deliveryStatus = ORDER_STATUS.CANCELLED;                                                             // This single code line change the 'deliveryStatus' of the 'order' into 'CANCELLED' ie it cancelled 'entire' order and it prevents 'ajio loop' hole.   
    if (order.paymentStatus === PAYMENT_STATUS.PAID) {                                                         
        order.paymentStatus = PAYMENT_STATUS.REFUNDED;                                                        // Here 'cancelled' the order just before 'delivered' so we can immediately 'refunded' but after 'delivered' it shoudl 'returned' only after approval of 'admin'.
        const user = await userOrderRepository.findUserById(userId);                                          // For retrieve 'user' data based on 'userId'
        user.walletBalance += order.totalAmount;                                                              // When 'order cancel' time the 'item' will rerturn and then we also 'refund' the amount to 'wallet'
        await user.save();
        const uniqueTxId = 'TX-' + Date.now().toString().slice(-6) + Math.floor(100 + Math.random() * 900);
        await userOrderRepository.createRefundTransaction({                                                   // For create a new 'document' in 'Transaction' collection
            user: userId,
            transactionId: uniqueTxId,
            orderId: order._id,
            amount: order.totalAmount,
            type: 'Credit',                                                                                   // Money 'credited' to user's account
            adjustmentType: 'Refund',
            reason: `Refund for Cancelled Order #${order.orderId}`,
            gateway: 'Wallet',                                                 
            status: 'Success',
            balanceAfter: user.walletBalance
        });
    }    
    await order.save();
    return true;
};



// For 'calculate' 'subTotal', 'taxTotal' etc and display it in 'ejs' file and then download as 'pdf'.
export const generateInvoicePdf = async (orderId, userId) => {
    const order = await userOrderRepository.findOrderById(orderId, userId, { path: 'items.product', select: 'productName name' }); // For retrieve 'name' and 'image' of 'product' based on 'userId' and 'productId'
    if (!order) throw new Error("Order not found");
    const invoiceDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });               // Create 'date' and convert into 'Indian'/'British' format.
    const orderDate = new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });    
    let subTotal = 0;
    let taxTotal = 0;    
    const itemsWithTax = order.items.map(item => {
        const taxRate = item.taxRate || USER_ORDER_CONSTANTS.DEFAULT_TAX_RATE;
        const amount = item.price * item.quantity;
        const taxAmount = (amount * taxRate) / 100;    
        subTotal += amount;
        taxTotal += taxAmount;        
        return { ...item, taxRate, taxAmount, amount };                                       // Create 'taxRate', 'taxAmount', 'amout' etc
    });
    const shipping = USER_ORDER_CONSTANTS.SHIPPING_COST;
    const discount = (subTotal + taxTotal + shipping) > order.totalAmount ? (subTotal + taxTotal + shipping) - order.totalAmount : 0;
    const invoiceData = {
        order, items: itemsWithTax, invoiceDate, orderDate, subTotal, taxTotal, shipping, discount, grandTotal: order.totalAmount
    };
    const templatePath = path.join(__dirname, '../../../view/user/invoiceTemplate.ejs');     // Here we use '__dirname' is the 'built-in' 'global variable' in 'node.js' and used for find the 'directory name' that current operating 'file' contains and using '../../../' because currently we operate in 'src/services/userOrderService.js' page and 'invoiceTemplate.ejs' file is '3' folder 'up' and 'path.join()' is the 'built-in' method of 'path' module and it used for 'join' the path without consider '\'(ie in 'windows') or '/'(in 'mac')ie this code directs exact file path. 
    const html = await ejs.renderFile(templatePath, invoiceData);                            // 'renderFile()' is built-in method of 'ejs' and used for 'mixing' both ie action same like 'res.render(filepath, object)'(Eg,'res.render('/user', {user: "Anu"})') ie 'templatePath' represents 'filePath' and 'object'/ 'data' represents 'invoiceData'
    const browser = await puppeteer.launch({ headless: 'new' });                             // 'puppeteer' is the 'built-in' 'npm' library created by 'Google' used for create/open a new 'browser' tab and '{ headless: 'new' }' is the 'object' used for 'disable' 'GUI' ie normally when we open Google 'Chrome' on computer, it has a 'GUI'(ie 'Graphical User Interface' ie 'buttons', a 'URL bar', and a visible window etc) but when we use '{ headless: 'new' }' 'disables' all these 'GUI'.
    const page = await browser.newPage();                                                    // It is also 'puppeteer' method and used for 'invisible pop up' ie it creates a 'blank workspace' in the server's memory for to work with, but 'nothing' will 'physically' pop up on your computer screen.
    await page.setContent(html, { waitUntil: 'networkidle0' });                              // 'page.setContent()' also 'built-in' 'puppeteer' method used for forcefully inject 'html'(ie path with object) into that blank and invisible tab(ie 'page') and '{ waitUntil: 'networkidle0'}' ensures that 'loading' all 'CSS files','fonts','images' etc before loading the 'pdf'(ie almost same like 'DOMContentLoaded()' but it wait only for 'html' 'not' for 'css', 'images' etc).
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' } });  // 'pdf()' also 'puppeteer' method used for 'formating'.
    await browser.close();                                                                   // 'close()' is also 'puppeteer' method and it used for shuts down the 'invisible Chrome browser'.
    return { pdfBuffer, orderId: order.orderId };
};


// For 'set up' the data for 'pick up'.
export const getReturnDetails = async (orderId, userId) => {
    const order = await userOrderRepository.findOrderById(orderId, userId, { path: 'items.product', select: 'productName name images' });  // For retrieve 'name' and 'image' of 'product' based on 'userId' and 'productId'
    if (!order) return null;
    const pickUpDateObj = new Date();
    pickUpDateObj.setDate(pickUpDateObj.getDate() + 3);
    const formattedPickUpDate = pickUpDateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    return { order, pickUpDate: formattedPickUpDate };
};


// For 'process return' and 'save' to 'orders' collection
export const processReturnRequest = async (orderId, userId, reason) => {
    if (!reason) throw new Error("A return reason is mandatory.");
    const order = await userOrderRepository.findOrderIdAndUserId(orderId, userId); // For retrieve 'order' details based on 'orderId' and 'userId'
    if (!order || order.deliveryStatus !== ORDER_STATUS.DELIVERED) {
        throw new Error("Invalid return request.");
    }
    order.returnRequest = {
        isRequested: true,
        reason: reason,
        status: RETURN_STATUS.PENDING,                                            // 'Pending' is the 'default' status when we start a request.
        requestedAt: new Date()
    };
    await order.save();
};



