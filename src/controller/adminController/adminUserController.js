
import User from '../../model/userModel.js';
import * as adminUserService from '../../services/admin/adminUserService.js';
import logger from '../../utilities/logger.js';


// For 'display' 'Users' page in admin side
export const getUsersList = async (req, res) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const [totalDocuments, newUsersCount] = await Promise.all([                          // Here 'running' '2' seperate queries(ie 'countDocuments()' is the built-in 'mongoose' method and each mongoose method return 'Promise' objects) at 'same' time(ie 'both' runs 'asynchronously') for better performance
            User.countDocuments(),
            User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } })                      // Here we retrieve 'all' 'user'(ie 'User.countDocuments()')data and also 'user' data of that created in 'last 30' days 
        ]);
        const dashboardData = await adminUserService.buildUsersListDashboard(req.query);     // For calculate 'user' details, 'loginDate','joiningDate', 'search', 'total pages', 'current page' etc
        res.render('admin/users', {
            ...dashboardData,
            totalDocuments,
            newUsersCount,
            pageTitle: "Users - Dresson",
            activePage: 'users'
        });
    } catch (error) {
        logger.error("Critical error building administrative query index trees:", error);
        res.status(500).send("Internal Server Error processing catalog query indexes.");
    }
};

// For 'block' or 'Unblock' user
export const toggleBlockStatus = async (req, res) => {
    try {
        await adminUserService.processToggleBlock(req.params.id);                         // For 'process' of 'toggling' of 'user blocking'
        res.redirect('/admin/users');
    } catch (error) {
        logger.error("Error updating status:", error);
        res.redirect('/admin/users');
    }
};


// For 'display' user details
export const getUserDetails = async (req, res) => {
    try {
        const data = await adminUserService.fetchUserDetails(req.params.id);   // For retrieve 'user' details like 'address', 'phone number' etc based on 'id'                   
        res.render('admin/userDetails', { 
            user: data.user, 
            displayAddress: data.displayAddress, 
            layout: 'layout/auth'
        });
    } catch (error) {
        logger.error("Error loading user details:", error);
        res.status(404).send(error.message);
    }
};


// For 'display' 'edit balance' of user in 'admin' side
export const loadEditBalance = async (req, res) => {
    try {
        const user = await adminUserService.fetchUserDetails(req.params.id);            // For retrieve 'user' details based on 'id'
        res.render('admin/editBalance', { user , layout: 'layout/auth',});
    } catch (error) {
        logger.error("Error loading balance management workspace:", error);
        res.status(500).send("Internal Server Error loading workspace.");
    }
};

// For 'update' balance of user in 'admin' side
export const updateBalance = async (req, res) => {
    try {
        await adminUserService.executeBalanceAdjustment(req.params.id, req.body);      // For 'handle' 'wallet balance' of 'user' in 'admin' side
        res.redirect(`/admin/users/${req.params.id}`);
    } catch (error) {
        logger.error("Critical error updating wallet records:", error);
        res.status(500).send("Internal Server Error updating financial assets.");
    }
};


// For 'display' user transactions in admin side
 export const getUserTransactions = async (req, res) => {
    try {
        const transactionPayload = await adminUserService.fetchUserLedgerTransactions(req.params.id, req.query); // For retrieve and 'recalculate' data for user 'transactions' in admin side      
        res.render('admin/userTransactions', {
            ...transactionPayload,
            baseUrl: `/admin/users/${req.params.id}/transactions`,
            layout: 'layout/auth',
        });
    } catch (error) {
        logger.error("Error building users transaction dashboard array table:", error);
        res.status(500).send("Internal Server Error pulling ledger entries loops.");
    }
};


// For 'display' 'user orders' page
export const getUserOrdersList = async (req, res) => {
    try {
        const ordersPayload = await adminUserService.fetchUserOrderLogs(req.params.id, req.query);       //  For calculate all data of 'user orders' like 'orders', 'total pages','current status', 'search query' etc
        res.render('admin/userOrders', {
            ...ordersPayload,
            baseUrl: `/admin/users/${req.params.id}/orders`,
            layout: 'layout/auth',
        });
    } catch (error) {
        logger.error("Critical error reading customer account orders list lines:", error);
        res.status(500).send("Internal Server Error processing active user order tables summaries.");
    }
};





