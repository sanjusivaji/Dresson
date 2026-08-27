import mongoose from 'mongoose';
import * as userRepository from '../../repository/admin/adminUserRepository.js';
import { PAGINATION_LIMITS, DEFAULT_ROLES } from '../../constants/adminUserConstants.js';


// For calculate 'user' details, 'loginDate','joiningDate', 'search', 'total pages', 'current page' etc
export const buildUsersListDashboard = async (query) => {
    const page = parseInt(query.page) || 1;
    const limit = PAGINATION_LIMITS.USERS;
    const skip = (page - 1) * limit;
    const selectedStatus = query.status || 'All';
    const searchQuery = query.search || '';                                                              // 'search', 'joiningDate', 'loginDate' etc came from 'admin' frontend when 'filtering' 
    const joiningDate = query.joiningDate || '';
    const loginDate = query.loginDate || '';
    let filterQuery = { role: DEFAULT_ROLES.USER };
    if (selectedStatus !== 'All') filterQuery.status = selectedStatus;
    if (searchQuery) {
        filterQuery.$or = [
            { firstName: { $regex: searchQuery, $options: 'i' } },                                       // Instead we can use 'new RegExp()'(ie 'const regex = new RegExp(searchQuery, "i")' and then  'filterQuery.$or(firstName: regex))
            { lastName: { $regex: searchQuery, $options: 'i' } },
            { email: { $regex: searchQuery, $options: 'i' } }
        ];
    }
    if (joiningDate) {
        const start = new Date(joiningDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(joiningDate);
         end.setHours(23, 59, 59, 999);
        filterQuery.createdAt = { $gte: start, $lte: end };
    }
    if (loginDate) {
        const start = new Date(loginDate);                                                                   
        start.setHours(0, 0, 0, 0);                                                                          // Here 'start' is the 'Date' object with value of 'loginDate'(ie it passes from front end of 'admin' when 'filter/ search')and we add 'hours', 'minutes', 'seconds' and 'milliseconds' into it because 'loginDate' 'not' contains this.
        const end = new Date(loginDate); 
        end.setHours(23, 59, 59, 999);
        filterQuery.updatedAt = { $gte: start, $lte: end };                                                 // We just created 'start' and 'end' 'Date' objects and then we assigned it into 'filterQuery.updatedAt'(ie 'filterQuery.updatedAt = { $gte: start, $lte: end }')then send it to data base for querying in 'below' for 'return 'user' based on 'loginDate'.
    }
    const users = await userRepository.findUsersWithFilter(filterQuery, skip, limit);                         // Retrieve 'user' data based on 'filter' and 'sort' the data based 'newly'(ie '{createdAt: -1}') created
    const absoluteTotalMatching = await userRepository.countUsers(filterQuery);                               // For 'counting' 'user' documents based on 'filterQuery'
    const totalUsersCount = await userRepository.countUsers({ role: DEFAULT_ROLES.USER });                    // For 'counting' 'user' documents based on 'default role' as 'user'
    const activeUsersCount = await userRepository.countUsers({ role: DEFAULT_ROLES.USER, status: 'Active' }); // For 'counting' 'user' documents based on 'default role' as 'user' only 'active users'.
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

// For 'process' of 'toggling' of 'user blocking'
export const processToggleBlock = async (id) => {
    const user = await userRepository.findUserById(id);                              // For retrieve 'user' data based on 'id'
    if (!user) throw new Error("User account signature record missing.");
    const isCurrentlyBlocked = user.status === 'Blocked';    
    user.status = isCurrentlyBlocked ? 'Active' : 'Blocked';
    user.isBlocked = !isCurrentlyBlocked;     
    await user.save();
    return user;
};


// For retrieve 'user' details like 'address', 'phone number' etc based on 'id'
export const fetchUserDetails = async (id) => {
    const user = await userRepository.findUserById(id);                                                                    // For retrieve 'user' data based on 'id'            
    if (!user) throw new Error("User account item records missing.");    
    const userAddresses = await userRepository.findAddressesByUserId(id);                                                  // For retrieve 'Address' data based on 'userId'
    let displayAddress = 'Address not updated yet';    
    if (userAddresses && userAddresses.length > 0) {
        const defaultAddr = userAddresses.find(addr => addr.isDefault === true) || userAddresses[0];                       // ‘find()’ is js ‘built-in’ method of ‘js’(‘not’ mongoose and ‘mongoose’ has also ‘find()’ named method) used for iterate the ‘array’ and return ‘first’ matching ‘item’(in ‘mongoose’ it is ‘findOne()’) as an 'object’(‘not’ array) which satisfy ‘condition’.
        displayAddress = `${defaultAddr.addressLine}, ${defaultAddr.city}, ${defaultAddr.state} - ${defaultAddr.pincode}`; // This is 'inside' 'if condition' and if it satisfy 'defaultAddr' object has 'value' and then we retreive each value like 'city', 'state' etc for 'display' it well.
        if (!user.phone || user.phone === 'Not provided') {
            user.phone = defaultAddr.phone; 
        }
    }
    return { user, displayAddress };
};



// For 'handle' 'wallet balance'(ie create 'transaction id', 'amount', 'transaction type', 'method' etc) of 'user' in 'admin' side
export const executeBalanceAdjustment = async (id, adjustmentData) => {
    const { adjustmentType, amount, reason } = adjustmentData;
    const user = await userRepository.findUserById(id);                            // For retrieve 'user' data based on 'id'
    if (!user) throw new Error("Target account parameters missing.");
    const parsedAmount = Number(amount);
    const originalBalance = user.walletBalance;
    let newBalance = originalBalance;    
    let txType = 'Credit';
    let txAmount = parsedAmount;
    let dbAdjustmentType = adjustmentType;
    if (adjustmentType === 'Add Funds') {                                         // 'admin' select 'Add Funds', when adding amout to user 'wallet'
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
    const uniqueTxId = 'TX-' + Date.now().toString().slice(-6) + Math.floor(100 + Math.random() * 900); // Here create a 'unique' 'transaction id' start with 'TX-' string and 'slice(-6)' get 'last' '6' digits from 'current' 'millisecond' from date and 'Math.random() * 900)' creates 'random' '3' digits.  
    await userRepository.createWalletTransaction({                                   // For 'create' a  new document, 'first' in 'server' and then it 'save' into database
        user: user._id,
        transactionId: uniqueTxId,
        amount: txAmount,
        type: txType,
        adjustmentType: dbAdjustmentType,
        reason: adjustmentType === 'Set Absolute Balance'                           // 'Set Absolute Balance' is the '3rd' type 'adjustmentType'.
            ? `Absolute Balance Reset (Admin Note: ${reason || 'None'})`
            : (reason || 'Administrative Manual Adjustment'),
        gateway: 'Wallet',
        status: 'Success',
        balanceAfter: newBalance
    });
    return user;
};


// For retrieve and 'recalculate' data for user 'transactions' in admin side
export const fetchUserLedgerTransactions = async (id, query) => {
    const page = parseInt(query.page) || 1;
    const currentFilter = query.type || 'All';  
    const limit = PAGINATION_LIMITS.TRANSACTIONS;
    const skip = (page - 1) * limit;    
    const user = await userRepository.findUserById(id);                                                 // For retrieve 'user' data based on 'id'                
    if (!user) throw new Error("User index node matches blank outputs.");
    const filterQuery = { user: id }; 
    if (currentFilter !== 'All') {
        filterQuery.type = currentFilter; 
    }
    const dbTransactions = await userRepository.findTransactionsWithFilter(filterQuery, skip, limit); // Retrieve data by using 'find()' from 'walletTransaction' collection based on 'userId' and also 'sort' as 'newly created'
    const totalTransactionsCount = await userRepository.countTransactionsWithFilter(filterQuery);     // Counting 'order' documents based on 'filter'      
    const transactions = dbTransactions.map(item => ({                                     
        transactionId: item.transactionId,
        date: item.createdAt,
        amount: item.amount,
        sign: item.type === 'Debit' ? '-' : '+',                                                      // It is for 'display' '-' if 'Debit' other wise '+'
        type: item.type,
        gateway: item.gateway,
        status: item.status
    }));   
    let totalCredit = 0, totalDebit = 0, totalRefund = 0;
    const allUserTransactions = await userRepository.findAllTransactionsByUserId(id);                // Retrieve 'walletTransaction' data based on 'userId'  
    allUserTransactions.forEach(item => {                                                            // Here we 'return' 'totalCredit', 'totalDebit' etc for display in 'front end' and here we 'accumulate' all value 'under' 'Credit', 'Debit' etc.
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



//  For calculate all data of 'user orders' like 'orders', 'total pages','current status', 'search query' etc
export const fetchUserOrderLogs = async (id, query) => {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Invalid User Identifier format.");    
    const page = parseInt(query.page) || 1;
    const limit = PAGINATION_LIMITS.ORDERS; 
    const skip = (page - 1) * limit;    
    const currentStatus = query.status || 'All';                                                       // Here 'query.status'  represents 'deliveryStatus'(ie like 'pending', 'processing' etc)and if 'no' status we assinged 'All' for 'prevent' crash the app
    const searchQuery = query.search || '';
    const filterQuery = { user: id }; 
    if (currentStatus !== 'All') {
        filterQuery.deliveryStatus = currentStatus;                                                   // If a 'hacker' passes an 'other type' of delivery status, we can prevent it in 'Order' model by 'enum'.
    }
    if (searchQuery) {
        filterQuery.$or = [                                                                            // 'searchQuery' may be 'orderId' or 'paymentMethod' and here we make it 'case insensitive'.
            { orderId: new RegExp(searchQuery, 'i') },
            { paymentMethod: new RegExp(searchQuery, 'i') }
        ];
    }
    const orders = await userRepository.findOrdersWithFilter(filterQuery, skip, limit);                 // For retrieve 'order' collection data based on 'filter' and sorted by 'newly' created.
    const totalMatchingOrders = await userRepository.countOrdersWithFilter(filterQuery);                // Counting 'order' documents based on 'filter'
    const user = await userRepository.findUserById(id);                                                 // For retrieve 'user' data based on 'id'    
    return {
        orders,
        currentPage: page,
        totalPages: Math.ceil(totalMatchingOrders / limit),
        currentStatus,
        searchQuery,
        user: user || { _id: id }
    };
};


