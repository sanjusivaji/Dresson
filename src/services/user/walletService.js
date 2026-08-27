
import * as walletRepository from '../../repository/user/walletRepository.js';
import { WALLET_CONSTANTS } from '../../constants/walletConstants.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';

// For calculates 'current balance', 'transactions', 'total pages' etc
export const getWalletPageData = async (userId, currentType, currentPage) => {
    const limit = WALLET_CONSTANTS.PAGINATION_LIMIT;
    const skip = (currentPage - 1) * limit;    
    let query = { user: userId };
    if (currentType !== WALLET_CONSTANTS.TYPES.ALL) {
        query.type = currentType; 
    }
    const totalTransactions = await walletRepository.countWalletTransactions(query);          // Retrieve 'total count' of 'transactions' document based on the 'query'(ie for pagination)
    const totalPages = Math.ceil(totalTransactions / limit) || 1;    
    const transactions = await walletRepository.findWalletTransactions(query, skip, limit);  // Retrieve 'transaction' based on 'query' and 'sort' in 'ascending'(ie 'newest first') order
    const latestTransaction = await walletRepository.getLatestTransaction(userId);           // Retrieve 'first matching' transaction based on 'userId'
    const currentBalance = latestTransaction ? latestTransaction.balanceAfter : 0;
    return { balance: currentBalance, transactions, totalPages };
};

// For 'send' 'payment details' like 'razor pay key', 'razor pay id' , 'currency', 'created date' etc
export const generateWalletOrder = async (amount) => {
    if (!amount || amount <= 0) throw new Error(WALLET_CONSTANTS.MESSAGES.INVALID_AMOUNT);
    const razorpay = new Razorpay({                        // Here a 'razorpay' 'object' based on 'RAZORPAY_KEY_ID' and 'RAZORPAY_SECRET'.
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_SECRET
    });
    const options = {                                     // Here 'options' 'object' contains the 'details' that put inside 'razorpay' object and it contains 'currency' details in 'smallest' unit(ie because 'razorpay' only understand the smallest unit of currency)by using 'amount * 100' and also include 'date' and 'time'.
        amount: amount * 100,
        currency: 'INR',
        receipt: `wallet_rcpt_${Date.now()}`
    };
    return await razorpay.orders.create(options);        // Here 'razorpay' is the 'main' object and 'orders' is 'sub' object of 'razorpay' and 'create()' is the 'built-in' method of 'orders' object used for 'send' 'http request' to 'razorpay' 'server' and then 'razorpay' return an 'orderId'.
};

// For 'verify payment' and 'create' a new document in 'walletTransaction' collection
export const verifyAndRechargeWallet = async (userId, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount) => {  // Here 'razorpay_order_id, razorpay_payment_id, and razorpay_signature' '3' arguement come from 'razorpay' server through 'front end' when 'bank' approves user has valid account and it has enough 'money'.
    const sign = razorpay_order_id + "|" + razorpay_payment_id;               // Combine both as 'string' with middle a '|'.
    const expectedSign = crypto
        .createHmac("sha256", process.env.RAZORPAY_SECRET)                    // It make a 'hash' using the 'SHA-256' algorithm,
        .update(sign.toString())                                              // Adding 'sign' into 'crypto' and below convert into 'hexadecimal' format.
        .digest("hex");                         
    if (razorpay_signature !== expectedSign) {
        throw new Error(WALLET_CONSTANTS.MESSAGES.INVALID_SIGNATURE);
    }
    const user = await walletRepository.findUserByIdDoc(userId);             // Retrieve user document.
    user.walletBalance = (user.walletBalance || 0) + Number(amount);
    await user.save(); 
    await walletRepository.createWalletTransaction({                         // For 'create' new 'document' 'WalletTransaction' collection based on 'given argument'.
        user: userId,
        transactionId: razorpay_payment_id,
        amount: amount,
        type: 'Credit',
        adjustmentType: 'Add Funds',                                         // For generate a chart
        reason: 'Wallet Recharge',                                           // For 'user' can read the 'reason' for 'money'
        balanceAfter: user.walletBalance,
        date: new Date()
    });
    return true;
};