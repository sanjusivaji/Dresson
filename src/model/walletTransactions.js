import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    transactionId: { type: String, required: true, unique: true },
    orderId: {type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    amount: { type: Number, required: true, min: 0 },
    type: { type: String, enum: ['Credit', 'Debit', 'Refund'], required: true },
    adjustmentType: { type: String, enum: ['Add Funds', 'Deduct Funds', 'Refund'], required: true },
    reason: { type: String, required: true },
    gateway: { type: String, default: 'Wallet' },
    status: { type: String, enum: ['Success', 'Pending', 'Failed'], default: 'Success' },
    balanceAfter: { type: Number, required: true, min: 0 }
}, { timestamps: true });

export default mongoose.model("WalletTransactions", transactionSchema, "walletTransactions");

