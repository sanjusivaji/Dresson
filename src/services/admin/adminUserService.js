import mongoose from 'mongoose';
import * as userRepository from '../../repository/admin/adminUserRepository.js';
import { PAGINATION_LIMITS, DEFAULT_ROLES } from '../../constants/adminUserConstants.js';


// Sets up the search, filters, and page limits to list the users for the admin dashboard
export const buildUsersListDashboard = async (query) => {
    const page = parseInt(query.page) || 1;
    const limit = PAGINATION_LIMITS.USERS;
    const skip = (page - 1) * limit;
    const selectedStatus = query.status || 'All';
    const searchQuery = query.search || '';
    const joiningDate = query.joiningDate || '';
    const loginDate = query.loginDate || '';
    let filterQuery = { role: DEFAULT_ROLES.USER };
    if (selectedStatus !== 'All') filterQuery.status = selectedStatus;
    if (searchQuery) {
        filterQuery.$or = [
            { firstName: { $regex: searchQuery,$options: 'i' } },
            { lastName: { $regex: searchQuery,$options: 'i' } },
            { email: { $regex: searchQuery,$options: 'i' } }
        ];
    }
    if (joiningDate) {
        const start = new Date(joiningDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(joiningDate);
        end.setHours(23, 59, 59, 999);
        filterQuery.createdAt = { $gte: start,$lte: end };
    }
    if (loginDate) {
        const start = new Date(loginDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(loginDate); 
        end.setHours(23, 59, 59, 999);
        filterQuery.updatedAt = { $gte: start,$lte: end };
    }
    const users = await userRepository.findUsersWithFilter(filterQuery, skip, limit);
    const absoluteTotalMatching = await userRepository.countUsers(filterQuery);
    const totalUsersCount = await userRepository.countUsers({ role: DEFAULT_ROLES.USER });
    const activeUsersCount = await userRepository.countUsers({ role: DEFAULT_ROLES.USER, status: 'Active' });
    return {
        users,
        stats: { totalUsers: totalUsersCount, activeUsers: activeUsersCount },
        currentPage: page,
        totalPages: Math.ceil(absoluteTotalMatching / limit),
        selectedStatus,
        searchQuery,
        joiningDate,
        loginDate
    };
};


// Switches a user's account status between Blocked and Active
export const processToggleBlock = async (id) => {
    const user = await userRepository.findUserById(id);
    if (!user) throw new Error("User account signature record missing.");
    const isCurrentlyBlocked = user.status === 'Blocked';    
    user.status = isCurrentlyBlocked ? 'Active' : 'Blocked';
    user.isBlocked = !isCurrentlyBlocked;     
    await user.save();
    return user;
};


// Gets user details like address and phone number using their ID
export const fetchUserDetails = async (id) => {
    const user = await userRepository.findUserById(id);
    if (!user) throw new Error("User account item records missing.");    
    const userAddresses = await userRepository.findAddressesByUserId(id);
    let displayAddress = 'Address not updated yet';    
    if (userAddresses && userAddresses.length > 0) {
        const defaultAddr = userAddresses.find(addr => addr.isDefault === true) || userAddresses[0];
        displayAddress = `${defaultAddr.addressLine}, ${defaultAddr.city}, ${defaultAddr.state} - ${defaultAddr.pincode}`;
        if (!user.phone || user.phone === 'Not provided') {
            user.phone = defaultAddr.phone; 
        }
    }
    return { user, displayAddress };
};


// Handles changing the user's wallet balance from the admin side
export const executeBalanceAdjustment = async (id, adjustmentData) => {
    const { adjustmentType, amount, reason } = adjustmentData;
    const user = await userRepository.findUserById(id);
    if (!user) throw new Error("Target account parameters missing.");
    const parsedAmount = Number(amount);
    const originalBalance = user.walletBalance;
    let newBalance = originalBalance;    
    let txType = 'Credit';
    let txAmount = parsedAmount;
    let dbAdjustmentType = adjustmentType;
    if (adjustmentType === 'Add Funds') {
        newBalance += parsedAmount;
        txType = 'Credit';
    } else if (adjustmentType === 'Deduct Funds') {
        newBalance -= parsedAmount;
        if (newBalance < 0) newBalance = 0;
        txType = 'Debit';
    } else if (adjustmentType === 'Set Absolute Balance') {
        newBalance = parsedAmount;
        const difference = newBalance - originalBalance;
        txAmount = Math.abs(difference);
        if (difference >= 0) {
            txType = 'Credit';
            dbAdjustmentType = 'Add Funds';
        } else {
            txType = 'Debit';
            dbAdjustmentType = 'Deduct Funds';
        }
    }
    user.walletBalance = newBalance;
    await user.save();
    const uniqueTxId = 'TX-' + Date.now().toString().slice(-6) + Math.floor(100 + Math.random() * 900);
    await userRepository.createWalletTransaction({
        user: user._id,
        transactionId: uniqueTxId,
        amount: txAmount,
        type: txType,
        adjustmentType: dbAdjustmentType,
        reason: adjustmentType === 'Set Absolute Balance'
            ? `Absolute Balance Reset (Admin Note: ${reason || 'None'})`
            : (reason || 'Administrative Manual Adjustment'),
        gateway: 'Wallet',
        status: 'Success',
        balanceAfter: newBalance
    });
    return user;
};


// Gets a list of all wallet transactions made by a user for the admin view
export const fetchUserLedgerTransactions = async (id, query) => {
    const page = parseInt(query.page) || 1;
    const currentFilter = query.type || 'All';  
    const limit = PAGINATION_LIMITS.TRANSACTIONS;
    const skip = (page - 1) * limit;    
    const user = await userRepository.findUserById(id);
    if (!user) throw new Error("User index node matches blank outputs.");
    const filterQuery = { user: id }; 
    if (currentFilter !== 'All') {
        filterQuery.type = currentFilter; 
    }
    const dbTransactions = await userRepository.findTransactionsWithFilter(filterQuery, skip, limit);
    const totalTransactionsCount = await userRepository.countTransactionsWithFilter(filterQuery);
    const transactions = dbTransactions.map(item => ({                                     
        transactionId: item.transactionId,
        date: item.createdAt,
        amount: item.amount,
        sign: item.type === 'Debit' ? '-' : '+',
        type: item.type,
        gateway: item.gateway,
        status: item.status
    }));   
    let totalCredit = 0, totalDebit = 0, totalRefund = 0;
    const allUserTransactions = await userRepository.findAllTransactionsByUserId(id);
    allUserTransactions.forEach(item => {
        if (item.type === 'Credit') totalCredit += item.amount;                            
        if (item.type === 'Debit') totalDebit += item.amount;
        if (item.type === 'Refund') totalRefund += item.amount;
    });    
    return {
        user,
        transactions,
        totals: { totalCredit, totalDebit, totalRefund },
        currentPage: page,
        totalPages: Math.ceil(totalTransactionsCount / limit),
        currentFilter 
    };
};


// Gets the list of a user's past orders with searching and filtering
export const fetchUserOrderLogs = async (id, query) => {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Invalid User Identifier format.");    
    const page = parseInt(query.page) || 1;
    const limit = PAGINATION_LIMITS.ORDERS; 
    const skip = (page - 1) * limit;    
    const currentStatus = query.status || 'All';
    const searchQuery = query.search || '';
    const filterQuery = { user: id }; 
    if (currentStatus !== 'All') {
        filterQuery.deliveryStatus = currentStatus;
    }
    if (searchQuery) {
        filterQuery.$or = [
            { orderId: new RegExp(searchQuery, 'i') },
            { paymentMethod: new RegExp(searchQuery, 'i') }
        ];
    }
    const orders = await userRepository.findOrdersWithFilter(filterQuery, skip, limit);
    const totalMatchingOrders = await userRepository.countOrdersWithFilter(filterQuery);
    const user = await userRepository.findUserById(id);
    return {
        orders,
        currentPage: page,
        totalPages: Math.ceil(totalMatchingOrders / limit),
        currentStatus,
        searchQuery,
        user: user || { _id: id }
    };
};