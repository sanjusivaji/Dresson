import * as checkoutService from '../../services/user/checkoutService.js';
import { CHECKOUT_ERRORS, COUPON_MESSAGES } from '../../constants/userCheckoutConstants.js';
import * as cartService from '../../services/user/cartService.js';
import Banner from '../../model/bannerModel.js';
import * as bannerRepository from '../../repository/admin/bannerRepository.js'


// For 'display' 'checkout' page
export const getCheckoutPage = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) return res.redirect('/login');
        const checkoutData = await checkoutService.getCheckoutPageData(userId);               // For retrieve all data for 'checkout' like 'cart', 'address', total', 'coupon' etc        
        // console.log(checkoutData)
        res.render('user/checkout', {
            layout: 'layout/user',
            pageTitle: 'Checkout - Dresson',
            ...checkoutData 
        });
    } catch (error) {
        console.error("Checkout Page Error:", error);        
        if (error.message === CHECKOUT_ERRORS.CART_EMPTY || error.message === CHECKOUT_ERRORS.CART_INVALID_ITEMS) {
            return res.redirect('/cart');
        }
        res.status(500).send("Could not load the checkout page.");
    }
};


// For 'processing' the 'checkout'
export const placeOrder = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) return res.status(401).json({ success: false, message: "Please log in to continue." });
        const { selectedAddress, paymentMethod } = req.body;
        if (!selectedAddress || !paymentMethod) return res.status(400).json({ success: false, message: "Address and Payment Method are required." });
        const result = await checkoutService.processOrder(userId, selectedAddress, paymentMethod);            // For 'processing' the 'checkout'
        if (result.razorpayOrder) {                                                            // For 'successful' payment through 'razorpay', then 'RAZORPAY_KEY_ID' return to 'front end' for display 'success' message in 'front-end' model
            return res.status(200).json({
                success: true,
                paymentMethod: result.finalPaymentMethod,
                razorpayOrder: result.razorpayOrder,
                orderId: result.order._id,
                key: process.env.RAZORPAY_KEY_ID 
            });
        }
        res.status(200).json({                                                              //  For when 'successful' payment through 'COD' or 'wallet' 
            success: true,
            paymentMethod: result.finalPaymentMethod,
            message: "Order placed successfully!",
            orderId: result.order._id
        });
   } catch (error) {               
        console.error("Place Order Error:", error);
        if (error.message === CHECKOUT_ERRORS.INSUFFICIENT_WALLET_BALANCE) {
            return res.status(400).json({ success: false, message: "Insufficient funds in your wallet." });
        }
        res.status(500).json({ success: false, message: "Could not process your order at this time." });
    }
};


// For 'verify' the 'razorpay' or 'card' payment and  'clear' the 'cart' and 'reduce' the 'product variant' only  after 'verification'
export const verifyPayment = async (req, res) => {
    try {
        const userId = req.session.user; // Need the userId to fetch their cart!    
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;        
        const isValid = checkoutService.verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature); // For 'verify' 'razorpay' 'signature' ie act as 'security checkpoint' and return 'true' or 'false'.        
        if (isValid) {
            const cart = await cartService.getUserCartData(userId); 
            if (cart && cart.appliedCoupon) {
                await checkoutService.recordCouponUsage(cart.appliedCoupon, userId);                                         // For 'store' the data of 'coupon' for checks 'coupon' already 'used' or 'not' by 'user' 
            }
            await checkoutService.finalizeOrderPayment(orderId);                                                             // For 'clear' the 'cart' and 'reduce' the 'product variant' only for 'razorpay' and 'card' after 'verification' 
            return res.status(200).json({ success: true, message: "Payment verified successfully" });
        } else {
            return res.status(400).json({ success: false, message: "Payment verification failed. Invalid signature." });
        }
    } catch (error) {
        console.error("Payment Verification Error:", error);
        res.status(500).json({ success: false, message: "Internal server error during verification" });
    }
};


// For 'apply' 'coupon' logic
export const applyCoupon = async (req, res) => {
   try {
        const userId = req.session.user;  
        if (!userId) return res.status(401).json({ success: false, message: COUPON_MESSAGES.UNAUTHORIZED });        
        const { couponCode } = req.body;
        if (!couponCode) return res.status(400).json({ success: false, message: COUPON_MESSAGES.MISSING_CODE });   
        const newTotals = await checkoutService.applyCouponLogic(userId, couponCode);                            // For 'check' 'coupon' is valid or not and calculate 'subtotal' after applying 'coupon'.
        return res.status(200).json({
            success: true,
            message: COUPON_MESSAGES.SUCCESS,
            newTotals                                                                                            // 'newTotal' is the 'object' contains 'newly' created 'total' value after apply 'coupon' and it also contains 'shippingFee', 'discount', 'toatalTax' etc
        });
    } catch (error) {
        console.error("Apply Coupon Error:", error);
        let errorMsg = COUPON_MESSAGES.SERVER_ERROR;                                                             // Here we checks 'error' message starts with "MIN_CART_VALUE", if it is 'true', then create a 'shortfall' variable and assign 'second' value(ie 'first' 'index' of array into it ie 'const shortfall = error.message.split("|")[1]') and display 'errorMsg' as this message for display it. 
        if (error.message.startsWith("MIN_CART_VALUE")) {
            const shortfall = error.message.split("|")[1];
            errorMsg = COUPON_MESSAGES.MIN_CART_VALUE(shortfall);
        } else if (COUPON_MESSAGES[error.message]) {
            errorMsg = COUPON_MESSAGES[error.message];
        }
        return res.status(400).json({ success: false, message: errorMsg });
    }
};


// For 'display' 'ordersuccess' page
export const getOrderSuccessPage = async (req, res) => {
    try {
        if (!req.query.id) return res.redirect('/profile/orders');
        const successData = await checkoutService.getOrderSuccessData(req.query.id);                            // For retrieve all data like 'delivery date', 'order number' etc for 'display' 'order success' page.                  
        if (!successData) return res.redirect('/profile/orders');
        const placement = 'Thank You Page';
        const thankYouBanner = await bannerRepository.placementBanner(placement)                                // Retrieve first matching document from 'Banner' collection based on 'placement' and 'isActive: true'
        res.render('user/orderSuccess', {
            layout: 'layout/user', 
            pageTitle: 'Order Successful - Dresson',
            ...successData,
            thankYouBanner
        });
    } catch (error) {
        console.error("Order Success Page Error:", error);
        res.redirect('/profile/orders');
    }
};



// export const getOrderSuccessPage = async (req, res) => {
//     try {
//         if (!req.query.id) return res.redirect('/profile/orders');
//         const successData = await checkoutService.getOrderSuccessData(req.query.id);                         // For retrieve all data like 'delivery date', 'order number' etc for 'display' 'order success' page.
//         if (!successData) return res.redirect('/profile/orders');
//         res.render('user/orderSuccess', {
//             layout: 'layout/user', 
//             pageTitle: 'Order Successful - Dresson',
//             ...successData
//         });
//     } catch (error) {
//         console.error("Order Success Page Error:", error);
//         res.redirect('/profile/orders');
//     }
// };