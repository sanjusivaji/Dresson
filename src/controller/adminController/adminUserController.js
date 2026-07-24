
import Order from '../../model/orderModel.js';
import User from '../../model/userModel.js';
import paginate from '../../utilities/paginationHelper.js';
import * as adminUserService from '../../services/admin/adminUserService.js';
import logger from '../../utilities/logger.js';


// For 'display' users
export const getUsersList = async (req, res) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const [totalDocuments, newUsersCount] = await Promise.all([   // Run independent database queries in parallel for better performance
            User.countDocuments(),
            User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } })
        ]);
        const dashboardData = await adminUserService.buildUsersListDashboard(req.query);
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
        await adminUserService.processToggleBlock(req.params.id);
        res.redirect('/admin/users');
    } catch (error) {
        logger.error("Error updating status:", error);
        res.redirect('/admin/users');
    }
};

export const updateUserDetails = async (req, res) => {
    try {
        const userId = req.params.id;
        const bodyData = req.body;
        const file = req.file;               // For  multer for profile image uploads
        await adminUserService.modifyUserProfile(userId, bodyData, file);
        res.redirect(`/admin/users/details/${userId}`);
    } catch (error) {
        logger.error("Error updating user profile:", error);
        res.status(500).send("Failed to update user profile.");
    }
};


export const getUserDetails = async (req, res) => {
    try {
        const user = await adminUserService.fetchUserDetails(req.params.id);
        res.render('admin/userDetails', { user });
    } catch (error) {
        logger.error("Error loading user details:", error);
        res.status(404).send(error.message);
    }
};

export const loadEditUser = async (req, res) => {
    try {
        const user = await adminUserService.fetchUserDetails(req.params.id);
        res.render('admin/editUser', { user });
    } catch (error) {
        logger.error("Error loading edit page:", error);
        res.status(404).send(error.message);
    }
};



export const loadEditBalance = async (req, res) => {
    try {
        const user = await adminUserService.fetchUserDetails(req.params.id);
        res.render('admin/editBalance', { user });
    } catch (error) {
        logger.error("Error loading balance management workspace:", error);
        res.status(500).send("Internal Server Error loading workspace.");
    }
};

export const updateBalance = async (req, res) => {
    try {
        await adminUserService.executeBalanceAdjustment(req.params.id, req.body);
        res.redirect(`/admin/users/${req.params.id}`);
    } catch (error) {
        logger.error("Critical error updating wallet records:", error);
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
        logger.error("Error building users transaction dashboard array table:", error);
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
        logger.error("Critical error reading customer account orders list lines:", error);
        res.status(500).send("Internal Server Error processing active user order tables summaries.");
    }
};


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
        logger.error("Error loading user orders:", error);
        res.status(500).send("Internal Server Error");
    }
};


export const checking = async(req,res) => {
    const name = req.body.name;
    const email = req.body.email;
    const nameUser = User.getUserById(email)
    const nameEmail = User.get
    if(!name || !email){
        throw new Error("You should put email and name");
    }
    
}






