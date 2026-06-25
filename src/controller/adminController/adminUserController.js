
import Order from '../../model/orderModel.js';
import paginate from '../../utilities/paginationHelper.js';
import * as adminUserService from '../../services/admin/adminUserService.js';
export const getUsersList = async (req, res) => {
    try {
        const dashboardData = await adminUserService.buildUsersListDashboard(req.query);
        res.render('admin/users', {
            ...dashboardData,
            pageTitle: "Users - Dresson",
            activePage: 'users'
        });
    } catch (error) {
        console.error("Critical error building administrative query index trees:", error);
        res.status(500).send("Internal Server Error processing catalog query indexes.");
    }
};

export const toggleBlockStatus = async (req, res) => {
    try {
        await adminUserService.processToggleBlock(req.params.id);
        res.redirect('/admin/users');
    } catch (error) {
        console.error("Error updating status:", error);
        res.redirect('/admin/users');
    }
};

export const getUserDetails = async (req, res) => {
    try {
        const user = await adminUserService.fetchUserDetails(req.params.id);
        res.render('admin/userDetails', { user });
    } catch (error) {
        console.error("Error loading user details:", error);
        res.status(404).send(error.message);
    }
};

export const loadEditUser = async (req, res) => {
    try {
        const user = await adminUserService.fetchUserDetails(req.params.id);
        res.render('admin/editUser', { user });
    } catch (error) {
        console.error("Error loading edit page:", error);
        res.status(404).send(error.message);
    }
};

export const updateUser = async (req, res) => {
    try {
        await adminUserService.modifyUserProfile(req.params.id, req.body, req.file);
        res.redirect(`/admin/users/${req.params.id}`);
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const loadEditBalance = async (req, res) => {
    try {
        const user = await adminUserService.fetchUserDetails(req.params.id);
        res.render('admin/editBalance', { user });
    } catch (error) {
        console.error("Error loading balance management workspace:", error);
        res.status(500).send("Internal Server Error loading workspace.");
    }
};

export const updateBalance = async (req, res) => {
    try {
        await adminUserService.executeBalanceAdjustment(req.params.id, req.body);
        res.redirect(`/admin/users/${req.params.id}`);
    } catch (error) {
        console.error("Critical error updating wallet records:", error);
        res.status(500).send("Internal Server Error updating financial assets.");
    }
};

export const getUserTransactions = async (req, res) => {
    try {
        const transactionPayload = await adminUserService.fetchUserLedgerTransactions(req.params.id, req.query.page);
        res.render('admin/userTransactions', {
            ...transactionPayload,
            baseUrl: `/admin/users/${req.params.id}/transactions`
        });
    } catch (error) {
        console.error("Error building users transaction dashboard array table:", error);
        res.status(500).send("Internal Server Error pulling ledger entries loops.");
    }
};

export const getUserOrdersList = async (req, res) => {
    try {
        const ordersPayload = await adminUserService.fetchUserOrderLogs(req.params.id, req.query);
        res.render('admin/userOrders', {
            ...ordersPayload,
            baseUrl: `/admin/users/${req.params.id}/orders`
        });
    } catch (error) {
        console.error("Critical error reading customer account orders list lines:", error);
        res.status(500).send("Internal Server Error processing active user order tables summaries.");
    }
};

// Kept variant pagination helper utility mapping if standalone route calls it directly
export const getUserOrders = async (req, res) => {
    try {
        const user = await adminUserService.fetchUserDetails(req.params.id);
        const currentStatus = req.query.status || 'All';
        const searchQuery = req.query.search || '';
        
        let query = { user: req.params.id };
        if (currentStatus !== 'All') query.deliveryStatus = currentStatus;
        if (searchQuery) query.orderId = { $regex: searchQuery, $options: 'i' };

        const { results: orders, currentPage, totalPages } = await paginate(Order, req, 5, query);

        res.render('admin/userOrders', {
            user, orders, currentPage, totalPages, currentStatus, searchQuery
        });
    } catch (error) {
        console.error("Error loading user orders:", error);
        res.status(500).send("Internal Server Error");
    }
};

export default { 
    getUsersList, 
    toggleBlockStatus, 
    getUserDetails, 
    loadEditUser, 
    updateUser, 
    loadEditBalance, 
    updateBalance, 
    getUserTransactions, 
    getUserOrdersList, 
    getUserOrders 
};







