import * as adminOrderService from '../../services/admin/adminOrderService.js';
import { ADMIN_PAGINATION } from '../../constants/orderConstants.js';


// For 'display' admin 'order' page
export const getAdminOrdersPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;        
        const filters = {
            search: req.query.search || '',
            status: req.query.status || '',
            payment: req.query.payment || '',
            date: req.query.date || ''
        };
        const queryParams = Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''));
        const { orders, totalPages } = await adminOrderService.getOrdersPaginated(page, ADMIN_PAGINATION.ORDERS_LIMIT, filters); // For 'pagination' and 'dynamic filtering' 
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

// For 'display' admin 'order details' page
export const getAdminOrderDetailsPage = async (req, res) => {
    try {
        const orderData = await adminOrderService.getOrderDetails(req.params.id);        // For retrieve 'order' data and create 'date'
        if (!orderData) {
            return res.redirect('/admin/orders');
        }
        res.render('admin/orderDetails', {
            layout: 'layout/auth',
            pageTitle: `Order ${orderData.order.orderId} - Admin`,
            order: orderData.order,
            formattedDate: orderData.formattedDate
        });
    } catch (error) {
        console.error("Error fetching admin order details:", error);
        res.status(500).send("Internal Server Error: Could not load order details.");
    }
};

// For 'update' 'deleiveryStatus' of 'order' and 'redirect' to 'order'
export const updateOrderStatus = async (req, res) => {
    try {
        await adminOrderService.updateStatus(req.params.id, req.body.status);            // For 'update' 'deleiveryStatus' of 'order' 
        res.redirect(`/admin/orders/${req.params.id}`);
    } catch (error) {
        console.error("Error updating order status:", error);
        res.status(400).send(error.message);
    }
};


// For display and handle 'order return' page in 'admin' side
export const getAdminReturnsPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const filters = {
            search: req.query.search || '',
            status: req.query.status || ''
        };
        const { returns, totalPages } = await adminOrderService.getReturnsPaginated(page, 10, filters);  // For retrieve 'order' data only that 'return' initiated and also return 'product' data with 'date' and 'total pages' for 'pagination'   
        
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
        const returnData = await adminOrderService.getReturnDetails(req.params.id);   // For 'order return' details in sorted order(ie 'new to old')with 'requested date' and 'returnId'
        if (!returnData) {
            return res.redirect('/admin/returns');
        }
        res.render('admin/returnDetails', {
            layout: 'layout/auth',
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



























// export const getAdminReturnsPage = async (req, res) => {
//     try {
//         const page = parseInt(req.query.page) || 1;
//         const filters = {
//             search: req.query.search || '',
//             status: req.query.status || ''
//         };
//         const { returns, totalPages } = await adminOrderService.getReturnsPaginated(page, ADMIN_PAGINATION.RETURNS_LIMIT, filters); // For retrieve 'order' data only that 'return' initiated and also return 'product' data with 'date' and 'total pages' for 'pagination'   
//         res.render('admin/orderReturns', {
//             layout: 'layout/admin',
//             pageTitle: 'Order Returns - Admin',
//             returns,
//             currentPage: page,
//             totalPages,
//             searchQuery: filters.search,
//             filterStatus: filters.status,
//             activePage: 'returns' 
//         });
//     } catch (error) {
//         console.error("Error fetching admin order returns:", error);
//         res.status(500).send("Internal Server Error: Could not load returns.");
//     }
// };

// // For 'dispaly' 'return details' page
// export const getAdminReturnDetailsPage = async (req, res) => {
//     try {
//         const returnData = await adminOrderService.getReturnDetails(req.params.id); // For 'order return' details in sorted order(ie 'new to old')with 'requested date' and 'returnId'
//         if (!returnData) {
//             return res.redirect('/admin/returns');
//         }
//         res.render('admin/returnDetails', {
//             layout: 'layout/auth',
//             pageTitle: `Return ${returnData.returnId} - Admin`,
//             order: returnData.order,
//             returnId: returnData.returnId,
//             requestedDate: returnData.requestedDate
//         });
//     } catch (error) {
//         console.error("Error fetching return details:", error);
//         res.status(500).send("Internal Server Error: Could not load return details.");
//     }
// };

// // For 'process' of return product
// export const processReturnRequest = async (req, res) => {
//     try {
//         const action = await adminOrderService.processReturn(req.params.id, req.body.action, req.body.adminMessage); // For 'process' of return product
//         const successText = `Return request successfully ${action.toLowerCase()}ed.`;
//         res.redirect('/admin/returns?warning=' + encodeURIComponent(successText));                                   // It is the built-in 'js' function used for 'translates' all space and '&', '?' etc  like symbols into '%20’(
//     } catch (error) {
//         console.error("Error processing return request:", error);
//         res.redirect('/admin/returns?error=' + encodeURIComponent(error.message));
//     }
// };