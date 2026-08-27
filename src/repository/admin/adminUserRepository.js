import User from '../../model/userModel.js';
import Order from '../../model/orderModel.js';
import WalletTransaction from '../../model/walletTransactions.js';
import Address from '../../model/addressModel.js'; 

// Retrieve 'user' data based on 'filter' and 'sort' the data based 'newly'(ie '{createdAt: -1}') created
export const findUsersWithFilter = async (filter, skip, limit) => {
    return await User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
};

// For 'counting' 'user' documents
export const countUsers = async (filter) => {
    return await User.countDocuments(filter);
};

// For retrieve 'user' data based on 'id'
export const findUserById = async (id) => {
    return await User.findById(id);
};


// For retrieve 'Address' data based on 'userId'
export const findAddressesByUserId = async (id) => {
    return await Address.find({ userId: id }); 
};

// For 'find' and 'upadate' user collection.
export const findUserAndUpdate = async (id, updateData) => {
    return await User.findByIdAndUpdate(id, updateData);           // Here 'id' is the 'filter' and 'updateData' is the 'data' for 'updation'
};

// Retrieve data from 'walletTransaction' collection based on 'userId' and also 'sort' as 'newly created'
export const findTransactionsByUserId = async (userId, skip, limit) => {
    return await WalletTransaction.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
};

// For 'counting' documents in 'walletTransaction' collection based on 'userId'
export const countTransactionsByUserId = async (userId) => {
    return await WalletTransaction.countDocuments({ user: userId });
};

// Retrieve 'walletTransaction' data based on 'userId'
export const findAllTransactionsByUserId = async (userId) => {
    return await WalletTransaction.find({ user: userId });
};

// For 'create' a  new document first in 'server' and then it 'save' into database
export const createWalletTransaction = async (txData) => {
    const transaction = new WalletTransaction(txData);
    return await transaction.save();
};

// Retrieve data by using 'find()' from 'walletTransaction' collection based on 'userId' and also 'sort' as 'newly created'
export const findTransactionsWithFilter = async (filterQuery, skip, limit) => {
    return await WalletTransaction.find(filterQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
};

// Counting total number of documents based on 'filterQuery'(ie 'user')
export const countTransactionsWithFilter = async (filterQuery) => {
    return await WalletTransaction.countDocuments(filterQuery);
};


// For retrieve 'order' collection data based on 'filter' and sorted by 'newly' created.
export const findOrdersWithFilter = async (filter, skip, limit) => {
    return await Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
};

// Counting 'order' documents based on 'filter'
export const countOrdersWithFilter = async (filter) => {
    return await Order.countDocuments(filter);
};