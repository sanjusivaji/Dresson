
import WalletTransaction from '../../model/walletTransactions.js';
import User from '../../model/userModel.js';


// Retrieve 'total count' of 'transactions' document based on the 'query'(ie for pagination)
export const countWalletTransactions = async (query) => {
    return await WalletTransaction.countDocuments(query);
};


// Retrieve 'transaction' based on 'query' and 'sort' in 'ascending'(ie 'newest first') order
export const findWalletTransactions = async (query, skip, limit) => {
    return await WalletTransaction.find(query)
        .populate({
            path: 'orderId',
            select: 'paymentMethod orderId' // Pulls the payment method from the orders collection
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
};



// Retrieve 'first matching' transaction based on 'userId'
export const getLatestTransaction = async (userId) => {
    return await WalletTransaction.findOne({ user: userId })
        .sort({ createdAt: -1 })                                                                                             // 'findOne()' return 'only' 'first matching' document and here 'findOne()' and 'sort()' both works together and retrieve 'newly' created 'document'
        .lean();
};


// Retrieve user document.
export const findUserByIdDoc = async (userId) => {
    return await User.findById(userId);
};


// For 'create' new 'document' 'WalletTransaction' collection based on 'transactionData'
export const createWalletTransaction = async (transactionData) => {
    return await WalletTransaction.create(transactionData);
};