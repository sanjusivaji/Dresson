import * as userOrderService from '../../services/user/userOrderService.js';


// For 'display' 'order' page
export const getUserOrdersPage = async (req, res) => {
    try {
        if (!req.session.user) return res.redirect('/login');
        const userId = typeof req.session.user === 'object' ? req.session.user._id : req.session.user;        
        const page = parseInt(req.query.page) || 1;
        const filters = {
            search: req.query.search || '',
            status: req.query.status || ''
        };
        const { orders, totalPages } = await userOrderService.getUserOrdersPaginated(userId, page, filters);  // For 'search', 'filter' and 'pagination' based 'query'        
        res.render('user/myOrders', {
            layout: 'layout/user',
            pageTitle: 'My Orders - Dresson',
            orders,
            currentPage: page,
            totalPages,
            searchQuery: filters.search,    
            filterStatus: filters.status,   
            activeSidebar: 'orders'  
        });
    } catch (error) {
        console.error("Error fetching user orders:", error);
        res.status(500).send("Internal Server Error: Could not load orders.");
    }
};


// For 'display' user 'order details' page
export const getOrderDetailsPage = async (req, res) => {
    try {
        const data = await userOrderService.getOrderDetails(req.params.id, req.session.user);                  // For 'order' details for 'display' it    
        if (!data) return res.redirect('/profile/orders');
        res.render('user/orderDetails', {
            layout: 'layout/user',
            pageTitle: `Order ${data.order.orderId} - Dresson`,
            order: data.order,
            formattedDate: data.formattedDate,
            summary: data.summary
        });
    } catch (error) {
        console.error("Error fetching order details:", error);
        res.status(500).render('error', { message: "Could not load order details." });
    }
};


// For 'cancel' order
export const cancelOrder = async (req, res) => {
    try {
        await userOrderService.cancelOrder(req.params.id, req.session.user);                 // For 'cancel' the order
        res.redirect(`/profile/orders/${req.params.id}`);
    } catch (error) {
        console.error("Error cancelling order:", error);
        if (error.message === "Order not found.") return res.status(404).send(error.message);
        res.status(500).send("Internal Server Error: Could not cancel order.");
    }
};


export const processItemAction = async (req, res) => {
    try {
        const userId = req.session.user._id || req.session.user;
        const { orderId, itemId, actionType, reason } = req.body;
        if (!reason) {
            return res.status(400).send("A reason is mandatory.");
        }
        await userOrderService.handleItemAction(orderId, itemId, userId, actionType, reason);        
        res.redirect(`/profile/orders/${orderId}`);
    } catch (error) {
        console.error(`Error processing item ${req.body.actionType}:`, error);
        res.status(500).send(`Could not process your ${req.body.actionType} request.`);
    }
};


// For 'calculate' 'subTotal', 'taxTotal' etc and display it in 'ejs' file and then download as 'pdf'.
export const downloadInvoice = async (req, res) => {
    try {
        const { pdfBuffer, orderId } = await userOrderService.generateInvoicePdf(req.params.id, req.session.user);  // For 'calculate' 'subTotal', 'taxTotal' etc and display it in 'ejs' file and then download as 'pdf'.        
        res.setHeader('Content-Type', 'application/pdf');                                                           // Here we send 'response' from 'server' to 'browser' with 'header' and 'body' ie 'header' as 'application/pdf' and below we 'send'(ie 'res.send()')body(ie 'pdfBuffer').
        res.setHeader('Content-Disposition', `inline; filename="Invoice-${orderId}.pdf"`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error("Error generating invoice:", error);
        if (error.message === "Order not found") return res.status(404).send(error.message);
        res.status(500).send("Internal Server Error: Could not generate invoice.");
    }
};


// For 'display' return details
export const getReturnDetailsPage = async (req, res) => {
    try {
        const data = await userOrderService.getReturnDetails(req.params.id, req.session.user);  // For 'set up' the data for 'pick up'.      
        if (!data) return res.redirect('/profile/orders');
        res.render('user/returnDetails', {
            layout: 'layout/user',
            pageTitle: `Return Details - ${data.order.orderId}`,
            order: data.order,
            pickUpDate: data.pickUpDate
        });
    } catch (error) {
        console.error("Error fetching return details:", error);
        res.status(500).send("Internal Server Error: Could not load return details.");
    }
};


// For process 'return request'
export const processReturnRequest = async (req, res) => {
    try {
        await userOrderService.processReturnRequest(req.params.id, req.session.user, req.body.reason);         // For 'process return' and 'save' to 'orders' collection
        res.redirect(`/profile/orders/${req.params.id}`);
    } catch (error) {
        console.error("Error processing return request:", error);
        if (error.message === "A return reason is mandatory." || error.message === "Invalid return request.") {
            return res.status(400).send(error.message);
        }
        res.status(500).send("Internal Server Error.");
    }
};


