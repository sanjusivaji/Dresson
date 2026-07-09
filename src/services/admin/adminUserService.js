import mongoose from 'mongoose';
import * as userRepository from '../../repository/admin/adminUserRepository.js';
import { PAGINATION_LIMITS, DEFAULT_ROLES } from '../../constants/adminUserConstants.js';

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
            { firstName: { $regex: searchQuery, $options: 'i' } },
            { lastName: { $regex: searchQuery, $options: 'i' } },
            { email: { $regex: searchQuery, $options: 'i' } }
        ];
    }

    if (joiningDate) {
        const start = new Date(joiningDate); start.setHours(0, 0, 0, 0);
        const end = new Date(joiningDate); end.setHours(23, 59, 59, 999);
        filterQuery.createdAt = { $gte: start, $lte: end };
    }

    if (loginDate) {
        const start = new Date(loginDate); start.setHours(0, 0, 0, 0);
        const end = new Date(loginDate); end.setHours(23, 59, 59, 999);
        filterQuery.updatedAt = { $gte: start, $lte: end };
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



export const processToggleBlock = async (id) => {
    const user = await userRepository.findUserById(id);
    if (!user) throw new Error("User account signature record missing.");

    const isCurrentlyBlocked = user.status === 'Blocked';
    
    user.status = isCurrentlyBlocked ? 'Active' : 'Blocked';
    user.isBlocked = !isCurrentlyBlocked; 
    
    await user.save();
    return user;
};

export const fetchUserDetails = async (id) => {
    const user = await userRepository.findUserById(id);
    if (!user) throw new Error("User account item records missing.");
    return user;
};

export const modifyUserProfile = async (id, bodyData, file) => {
    const nameParts = (bodyData.name || '').trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');

    const updateData = {
        status: bodyData.status,
        firstName,
        lastName,
        phone: bodyData.phone,
        email: bodyData.email,
        address: bodyData.address
    };

    if (file) {
        updateData.profileImage = file.filename;
    }
    return await userRepository.findUserAndUpdate(id, updateData);
};


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

export const fetchUserLedgerTransactions = async (id, queryPage) => {
    const page = parseInt(queryPage) || 1;
    const limit = PAGINATION_LIMITS.TRANSACTIONS;
    const skip = (page - 1) * limit;

    const user = await userRepository.findUserById(id);
    if (!user) throw new Error("User index node matches blank outputs.");

    const dbTransactions = await userRepository.findTransactionsByUserId(id, skip, limit);
    const totalTransactionsCount = await userRepository.countTransactionsByUserId(id);

    const transactions = dbTransactions.map(t => ({
        transactionId: t.transactionId,
        date: t.createdAt,
        amount: t.amount,
        sign: t.type === 'Debit' ? '-' : '+',
        type: t.type,
        gateway: t.gateway,
        status: t.status
    }));

    let totalCredit = 0, totalDebit = 0, totalRefund = 0;
    const allUserTransactions = await userRepository.findAllTransactionsByUserId(id);
    
    allUserTransactions.forEach(t => {
        if (t.type === 'Credit') totalCredit += t.amount;
        if (t.type === 'Debit') totalDebit += t.amount;
        if (t.type === 'Refund') totalRefund += t.amount;
    });

    return {
        user,
        transactions,
        totals: { totalCredit, totalDebit, totalRefund },
        currentPage: page,
        totalPages: Math.ceil(totalTransactionsCount / limit)
    };
};

export const fetchUserOrderLogs = async (id, query) => {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Invalid User Identifier format.");
    const userObjectId = new mongoose.Types.ObjectId(id);

    const page = parseInt(query.page) || 1;
    const limit = PAGINATION_LIMITS.ORDERS;
    const skip = (page - 1) * limit;

    const currentStatus = query.status || 'All';
    const searchQuery = query.search || '';

    let filterQuery = {
        $or: [
            { user: userObjectId },
            { userId: id },
            { user: id }
        ]
    };

    if (currentStatus !== 'All') {
        filterQuery = {
            $and: [
                { $or: filterQuery.$or },
                { deliveryStatus: currentStatus }
            ]
        };
    }

    if (searchQuery) {
        const searchCondition = {
            $or: [
                { orderId: { $regex: searchQuery, $options: 'i' } },
                { paymentMethod: { $regex: searchQuery, $options: 'i' } }
            ]
        };
        if (filterQuery.$and) {
            filterQuery.$and.push(searchCondition);
        } else {
            filterQuery = {
                $and: [
                    { $or: filterQuery.$or },
                    searchCondition
                ]
            };
        }
    }

    const orders = await userRepository.findOrdersWithFilter(filterQuery, skip, limit);
    const totalMatchingOrders = await userRepository.countOrdersWithFilter(filterQuery);
    const user = await userRepository.findUserById(userObjectId);

    return {
        orders,
        currentPage: page,
        totalPages: Math.ceil(totalMatchingOrders / limit),
        currentStatus,
        searchQuery,
        user: user || { _id: id }
    };
};