import * as adminOrderService from '../../services/admin/adminOrderService.js';
import { ADMIN_PAGINATION } from '../../constants/orderConstants.js';


//  For 'display' 'order' page
export const getAdminOrdersPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;        
        const filters = {
            search: req.query.search || '',
            status: req.query.status || '',
            payment: req.query.payment || '',
            date: req.query.date || ''
        };
        const queryParams = Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== '')); // Removes empty filters from the list
        const { orders, totalPages } = await adminOrderService.getOrdersPaginated(page, ADMIN_PAGINATION.ORDERS_LIMIT, filters);
        res.render('admin/orders', {
            layout: 'layout/admin',
            pageTitle: 'Order Management - Admin',
            orders,
            currentPage: page,
            totalPages,
            activePage: 'orders',
            searchQuery: filters.search,
            statusFilter: filters.status,
            paymentFilter: filters.payment,
            dateFilter: filters.date,
            queryParams
        });
    } catch (error) {
        console.error("Error fetching admin orders:", error);
        res.status(500).send("Internal Server Error");
    }
};


//  For 'display' 'order details' page
export const getAdminOrderDetailsPage = async (req, res) => {
    try {
        const orderData = await adminOrderService.getOrderDetails(req.params.id);
        if (!orderData) {
            return res.redirect('/admin/orders');
        }
        res.render('admin/orderDetails', {
             layout: 'layout/admin',                                                                                        // Uses the admin sidebar layout
            pageTitle: `Order ${orderData.order.orderId} - Admin`,
            order: orderData.order,
            formattedDate: orderData.formattedDate
        });
    } catch (error) {
        console.error("Error fetching admin order details:", error);
        res.status(500).send("Internal Server Error: Could not load order details.");
    }
};


// Updates the delivery status of an order and reloads the page
export const updateOrderStatus = async (req, res) => {
    try {
        await adminOrderService.updateStatus(req.params.id, req.body.status);
        res.redirect(`/admin/orders/${req.params.id}`);
    } catch (error) {
        console.error("Error updating order status:", error);
        res.status(400).send(error.message);
    }
};



export const getAdminReturnsPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const filters = {
            search: req.query.search || '',
            status: req.query.status || ''
        };
        const { returns, totalPages } = await adminOrderService.getReturnsPaginated(page, 10, filters);
        res.render('admin/orderReturns', {
            layout: 'layout/admin',
            pageTitle: 'Order Returns - Admin',
            returns,
            currentPage: page,
            totalPages,
            searchQuery: filters.search,
            filterStatus: filters.status,
            activePage: 'returns' 
        });
    } catch (error) {
        console.error("Error fetching admin order returns:", error);
        res.status(500).send("Internal Server Error: Could not load returns.");
    }
};



export const getAdminReturnDetailsPage = async (req, res) => {
    try {
        const returnData = await adminOrderService.getReturnDetails(req.params.id);
        if (!returnData) {
            return res.redirect('/admin/returns');
        }
        res.render('admin/returnDetails', {
             layout: 'layout/admin',
            pageTitle: `Return ${returnData.returnId} - Admin`,
            order: returnData.order,
            returnId: returnData.returnId,
            requestedDate: returnData.requestedDate
        });
    } catch (error) {
        console.error("Error fetching return details:", error);
        res.status(500).send("Internal Server Error: Could not load return details.");
    }
};


// For 'handle' 'approve' or 'reject' the return from 'user'
export const processReturnRequest = async (req, res) => {
    try {
        const action = await adminOrderService.processReturn(req.params.id, req.body.action, req.body.adminMessage); 
        const successText = `Return request successfully ${action.toLowerCase()}ed.`;
        res.redirect('/admin/returns?warning=' + encodeURIComponent(successText));                                   
    } catch (error) {
        console.error("Error processing return request:", error);
        res.redirect('/admin/returns?error=' + encodeURIComponent(error.message));
    }
};
