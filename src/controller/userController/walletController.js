// src/controller/userController/walletController.js
import * as walletService from '../../services/user/walletService.js';
import { WALLET_CONSTANTS } from '../../constants/walletConstants.js';

// Load the Wallet Page
export const getWalletPage = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) return res.redirect('/login');        
        const currentType = req.query.type || WALLET_CONSTANTS.TYPES.ALL;
        const currentPage = parseInt(req.query.page) || 1;         
        const walletData = await walletService.getWalletPageData(userId, currentType, currentPage); // For calculates 'current balance', 'transactions', 'total pages' etc
        res.render('user/wallet', {
            layout: 'layout/user', 
            pageTitle: 'My Wallet - Dresson',
            balance: walletData.balance,
            transactions: walletData.transactions,
            currentPage: currentPage,
            razorpayKeyId: process.env.RAZORPAY_KEY_ID,
            totalPages: walletData.totalPages,
            currentType: currentType,
            activeSidebar: 'wallet'                                      
        });
    } catch (error) {
        console.error("Error loading wallet page:", error);
        res.status(500).send("An error occurred while loading your wallet.");
    }
};

 // For 'send' 'payment details' like 'razor pay key', 'razor pay id' , 'currency', 'created date' etc and also send 'status' 'success'  
export const createWalletOrder = async (req, res) => {
    try {
        const { amount } = req.body;
        const order = await walletService.generateWalletOrder(amount);                                // For 'send' 'payment details' like 'razor pay key', 'razor pay id' , 'currency', 'created date' etc        
        res.status(200).json({ success: true, order });
    } catch (error) {
        console.error("Razorpay Order Error:", error);
        res.status(400).json({ success: false, message: error.message || WALLET_CONSTANTS.MESSAGES.ORDER_CREATION_FAILED });
    }
};

// For 'verify payment' and 'update' 'walletTransaction' collection(ie through 'verifyAndRechargeWallet()')and 'send' 'success' message
export const verifyWalletPayment = async (req, res) => {
    try {
        const userId = req.session.user._id || req.session.user; 
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;
        await walletService.verifyAndRechargeWallet(userId, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount);    // For 'verify payment' and 'create' a new document in 'walletTransaction' collection
        return res.status(200).json({ success: true, message: WALLET_CONSTANTS.MESSAGES.RECHARGE_SUCCESS });
    } catch (error) {
        console.error("Payment Verification Error:", error);
        const statusCode = error.message === WALLET_CONSTANTS.MESSAGES.INVALID_SIGNATURE ? 400 : 500;
        res.status(statusCode).json({ success: false, message: error.message || WALLET_CONSTANTS.MESSAGES.VERIFICATION_FAILED });
    }
};