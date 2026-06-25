import User from '../../model/userModel.js';
import Order from '../../model/orderModel.js';
import WalletTransaction from '../../model/walletTransactions.js';

export const findUsersWithFilter = async (filter, skip, limit) => {
    return await User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
};

export const countUsers = async (filter) => {
    return await User.countDocuments(filter);
};

export const findUserById = async (id) => {
    return await User.findById(id);
};

export const findUserAndUpdate = async (id, updateData) => {
    return await User.findByIdAndUpdate(id, updateData);
};

export const findTransactionsByUserId = async (userId, skip, limit) => {
    return await WalletTransaction.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
};

export const countTransactionsByUserId = async (userId) => {
    return await WalletTransaction.countDocuments({ user: userId });
};

export const findAllTransactionsByUserId = async (userId) => {
    return await WalletTransaction.find({ user: userId });
};

export const createWalletTransaction = async (txData) => {
    const transaction = new WalletTransaction(txData);
    return await transaction.save();
};

export const findOrdersWithFilter = async (filter, skip, limit) => {
    return await Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
};

export const countOrdersWithFilter = async (filter) => {
    return await Order.countDocuments(filter);
};