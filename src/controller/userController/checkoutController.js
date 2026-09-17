import * as checkoutService from '../../services/user/checkoutService.js';
import { CHECKOUT_ERRORS, COUPON_MESSAGES } from '../../constants/userCheckoutConstants.js';
import * as bannerRepository from '../../repository/admin/bannerRepository.js';


const getUserId = (req) => {
    if (req.session && req.session.user) {
        return req.session.user._id || req.session.user.id || req.session.user;
    }
    if (req.session && req.session.userId) {
        return req.session.userId;
    }
    if (req.user) {
        return req.user._id || req.user.id || req.user;
    }
    return null;
};


// For 'display' 'checkout' page
export const getCheckoutPage = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.redirect('/login');
        }
        const sessionCouponCode = req.session.appliedCoupon || null;
        const directBuyCart = req.query.mode === 'direct' ? req.session.directBuyCart : null;
        const checkoutData = await checkoutService.getCheckoutPageData(userId, sessionCouponCode, directBuyCart);
        res.render('user/checkout', {
            cart: checkoutData.cart,
            addresses: checkoutData.addresses,
            totals: checkoutData.totals, 
            coupons: checkoutData.availableCoupons,
            appliedCoupon: checkoutData.appliedCoupon,
            layout: 'layout/user',
            pageTitle: "Checkout - Dresson"
        });
    } catch (error) {
        console.error("Error loading checkout:", error);
        if (error.message === 'CART_EMPTY') {
            return res.redirect('/shop');
        }
        res.status(500).send("An error occurred while loading the checkout page.");
    }
};


// For apply coupon
export const applyCoupon = async (req, res) => {
   try {
        const userId = req.session.user;  
        if (!userId) return res.status(401).json({ success: false, message: COUPON_MESSAGES.UNAUTHORIZED });        
        const { couponCode } = req.body;
        const newTotals = await checkoutService.applyCouponLogic(userId, couponCode);                            
        req.session.appliedCoupon = couponCode;
        req.session.save((err) => {
            if (err) throw err;
            return res.status(200).json({ success: true, message: COUPON_MESSAGES.SUCCESS, newTotals });
        });
    } catch (error) {
        console.error("Apply Coupon Error:", error);
        let errorMsg = COUPON_MESSAGES.SERVER_ERROR;                                                             
        if (error.message.startsWith("MIN_CART_VALUE")) {
            const shortfall = error.message.split("|")[1];
            errorMsg = COUPON_MESSAGES.MIN_CART_VALUE(shortfall);
        } else if (COUPON_MESSAGES[error.message]) {
            errorMsg = COUPON_MESSAGES[error.message];
        }
        return res.status(400).json({ success: false, message: errorMsg });
    }
};


// For 'remove' coupon
export const removeCoupon = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
        delete req.session.appliedCoupon;
        req.session.save(async (err) => {
            if (err) throw err;
            const checkoutData = await checkoutService.getCheckoutPageData(userId, null); 
            return res.status(200).json({ success: true, message: "Coupon removed.", newTotals: checkoutData.totals });
        });
    } catch (error) {
        console.error("Remove Coupon Error:", error);
        return res.status(500).json({ success: false, message: "Failed to remove coupon." });
    }
};


// For 'processing' the 'checkout'
export const placeOrder = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) return res.status(401).json({ success: false, message: "Please log in to continue." });
        const { selectedAddress, paymentMethod } = req.body;
        if (!selectedAddress || !paymentMethod) return res.status(400).json({ success: false, message: "Address and Payment Method are required." });
        const sessionCouponCode = req.session.appliedCoupon;
        const result = await checkoutService.processOrder(userId, selectedAddress, paymentMethod, sessionCouponCode);
        if (sessionCouponCode) {
            delete req.session.appliedCoupon;
            req.session.save((err) => {
                if (err) console.error("Error clearing session coupon:", err);
            });
        }
        if (result.razorpayOrder) {
            return res.status(200).json({
                success: true,
                paymentMethod: result.finalPaymentMethod,
                razorpayOrder: result.razorpayOrder,
                orderId: result.order._id,
                key: process.env.RAZORPAY_KEY_ID 
            });
        }        
        res.status(200).json({
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
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;  
        const isValid = checkoutService.verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature); 
        if (isValid) {
            await checkoutService.finalizeOrderPayment(orderId, razorpay_payment_id, razorpay_order_id);                                                             
            return res.status(200).json({ success: true, message: "Payment verified successfully" });
        } else {
            return res.status(400).json({ success: false, message: "Payment verification failed. Invalid signature." });
        }
    } catch (error) {
        console.error("Payment Verification Error:", error);
        res.status(500).json({ success: false, message: "Internal server error during verification" });
    }
};


// For 'display' 'ordersuccess' page
export const getOrderSuccessPage = async (req, res) => {
    try {
        if (!req.query.id) return res.redirect('/profile/orders');
        const successData = await checkoutService.getOrderSuccessData(req.query.id);
        if (!successData) return res.redirect('/profile/orders');
        const placement = 'Thank You Page';
        const thankYouBanner = await bannerRepository.placementBanner(placement);
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


// For 'display' 'order failed' page
export const getOrderFailedPage = async (req, res) => {
    try {
        const orderId = req.query.id;
        if (!orderId) return res.redirect('/profile/orders');
        res.render('user/orderFailed', {
            layout: 'layout/user', 
            pageTitle: 'Payment Failed - Dresson',
            orderId: orderId
        });
    } catch (error) {
        console.error("Order Failed Page Error:", error);
        res.redirect('/profile/orders');
    }
};


// For 'retrying' a failed Razorpay payment
export const retryPayment = async (req, res) => {
    try {
        const { orderId } = req.body;
        const order = await checkoutService.getOrderByIdForRetry(orderId); 
        if (!order) return res.status(404).json({ success: false, message: "Order not found" });
        const razorpayOrder = await checkoutService.generateRazorpayOrder(order._id, order.totalAmount);
        return res.status(200).json({
            success: true,
            razorpayOrder: razorpayOrder,
            key: process.env.RAZORPAY_KEY_ID,
            orderId: order._id
        });
    } catch (error) {
        console.error("Retry Payment Error:", error);
        res.status(500).json({ success: false, message: "Could not initiate payment retry." });
    }
};