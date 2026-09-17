import * as walletRepository from '../../repository/user/walletRepository.js';
import { WALLET_CONSTANTS } from '../../constants/walletConstants.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';


// Calculates the user's current wallet balance and gathers their transaction history for the page
export const getWalletPageData = async (userId, currentType, currentPage) => {
    const limit = WALLET_CONSTANTS.PAGINATION_LIMIT;
    const skip = (currentPage - 1) * limit;    
    let query = { 
        user: userId,
        gateway: { $nin: ['COD', 'cod', 'Razorpay', 'razorpay'] },
        reason: { $not: /razorpay|cod/i } 
    };
    if (currentType !== WALLET_CONSTANTS.TYPES.ALL) {
        query.type = currentType; 
    }
    const totalTransactions = await walletRepository.countWalletTransactions(query);         
    const totalPages = Math.ceil(totalTransactions / limit) || 1;    
    const transactions = await walletRepository.findWalletTransactions(query, skip, limit);  
    const latestTransaction = await walletRepository.getLatestTransaction(userId);           
    const currentBalance = latestTransaction ? latestTransaction.balanceAfter : 0;
    return { balance: currentBalance, transactions, totalPages };
};


// Connects to Razorpay to generate a safe digital receipt before the user adds money to their wallet
export const generateWalletOrder = async (amount) => {
    if (!amount || amount <= 0) throw new Error(WALLET_CONSTANTS.MESSAGES.INVALID_AMOUNT);
    const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_SECRET
    });
    const options = {
        amount: amount * 100,
        currency: 'INR',
        receipt: `wallet_rcpt_${Date.now()}`
    };
    return await razorpay.orders.create(options);
};


// Checks the digital signature from the bank to prevent hackers from faking payments, then adds the money
export const verifyAndRechargeWallet = async (userId, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount) => {
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
        .createHmac("sha256", process.env.RAZORPAY_SECRET)
        .update(sign.toString())
        .digest("hex");
    if (razorpay_signature !== expectedSign) {
        throw new Error(WALLET_CONSTANTS.MESSAGES.INVALID_SIGNATURE);
    }
    const user = await walletRepository.findUserByIdDoc(userId);
    user.walletBalance = (user.walletBalance || 0) + Number(amount);
    await user.save(); 
    await walletRepository.createWalletTransaction({
        user: userId,
        transactionId: razorpay_payment_id,
        amount: amount,
        type: 'Credit',
        adjustmentType: 'Add Funds',
        reason: 'Wallet Recharge',
        balanceAfter: user.walletBalance,
        date: new Date()
    });
    return true;
};