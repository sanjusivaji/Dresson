import * as checkoutService from '../../services/user/checkoutService.js';
import { CHECKOUT_MESSAGES } from '../../constants/checkoutConstants.js';


// Renders the Checkout EJS page
export const getCheckoutPage = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) return res.redirect('/login');

        const checkoutData = await checkoutService.getCheckoutPageData(userId);
        res.render('user/checkout', {
            layout: 'layout/user',
            pageTitle: 'Checkout - Dresson',
            cart: checkoutData.cart,
            addresses: checkoutData.addresses,
            totals: checkoutData.totals,
            coupons: checkoutData.availableCoupons
        });

    } catch (error) {
        console.error("Checkout Page Error:", error);
        
        if (error.message === "CART_EMPTY" || error.message === "CART_INVALID_ITEMS") {
            return res.redirect('/cart');
        }
        
        res.status(500).send("Could not load the checkout page.");
    }
};




// Handles the AJAX "Place Order" button click
export const placeOrder = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Please log in to continue." });
        }

        const { selectedAddress, paymentMethod } = req.body;

        // Validation
        if (!selectedAddress) {
            return res.status(400).json({ success: false, message: CHECKOUT_MESSAGES.ADDRESS_REQUIRED });
        }
        if (!paymentMethod) {
            return res.status(400).json({ success: false, message: CHECKOUT_MESSAGES.PAYMENT_REQUIRED });
        }

        // Process the order via the Service layer
        const order = await checkoutService.processOrder(userId, { selectedAddress, paymentMethod });

        // Note: If you integrate Razorpay later, you will send the Razorpay order ID back here instead of a direct success message.
        res.status(200).json({
            success: true,
            message: CHECKOUT_MESSAGES.ORDER_SUCCESS,
            orderId: order._id
        });

    } catch (error) {
        console.error("Place Order API Error:", error);
        res.status(500).json({ success: false, message: CHECKOUT_MESSAGES.ORDER_FAILED });
    }
};