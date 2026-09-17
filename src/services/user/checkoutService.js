import * as checkoutRepository from '../../repository/user/checkoutRepository.js';
import * as addressRepository from '../../repository/user/userAddressRepository.js';
import * as cartService from './cartService.js';
import * as cartRepository from '../../repository/user/cartRepository.js';
import { SHIPPING_CONFIG, CHECKOUT_ERRORS } from '../../constants/userCheckoutConstants.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_SECRET,
});


// For retrieve all data for 'checkout' like 'cart', 'address', total', 'coupon' etc
export const getCheckoutPageData = async (userId, sessionCouponCode, directBuyCart = null) => {
    const cart = directBuyCart || await cartService.getUserCartData(userId);
    const addresses = await addressRepository.findAddressesByUserId(userId);
    if (!cart || !cart.items || cart.items.length === 0) throw new Error(CHECKOUT_ERRORS.CART_EMPTY);
    if (cart.hasInvalidItems) throw new Error(CHECKOUT_ERRORS.CART_INVALID_ITEMS);
    let subTotal = 0;
    let totalTax = 0;
    cart.items.forEach(item => {
        const billableQty = item.quantity - (item.freeQuantity || 0);
        const itemTotalPrice = item.effectivePrice * billableQty;
        subTotal += itemTotalPrice;
        totalTax += (itemTotalPrice * (item.taxRate || 0)) / 100;
    });
    let discount = 0;
    let appliedCouponCode = null;
    if (sessionCouponCode) {
        const coupon = await checkoutRepository.findCouponByCode(sessionCouponCode);
        if (coupon && coupon.isActive && new Date() <= coupon.validTill && subTotal >= coupon.minCartValue) {
            appliedCouponCode = coupon.couponCode;
            discount = coupon.discountType === 'percentage'
                ? Math.min((subTotal * coupon.discountValue) / 100, coupon.maxDiscount || Infinity)
                : coupon.discountValue;
            if (discount > subTotal) discount = subTotal;
        }
    }
    const activeOffers = typeof cartRepository.getActiveOffers === 'function' ? await cartRepository.getActiveOffers() : [];
    const now = new Date();
    const freeShippingOffer = activeOffers.find(offer =>
        (offer.type === 'Free Shipping' || offer.type === 'Free shipping') &&
        offer.targetType === 'Entire Order' &&
        offer.isManuallyActive &&
        now >= new Date(offer.startDate) &&
        now <= new Date(offer.endDate)
    );
    let shipping = SHIPPING_CONFIG.STANDARD_FEE;
    let preliminaryTotal = subTotal + totalTax - discount;
    if (preliminaryTotal >= SHIPPING_CONFIG.FREE_SHIPPING_THRESHOLD) {
        shipping = 0;
    } else if (freeShippingOffer && preliminaryTotal >= freeShippingOffer.discountValue) {
        shipping = 0;
    }
    const grandTotal = subTotal + totalTax + shipping - discount;
    const availableCoupons = await checkoutRepository.findActiveCoupons(new Date());
    return {
        cart,
        addresses,
        totals: { subTotal, tax: totalTax, shipping, discount, grandTotal },
        availableCoupons,
        appliedCoupon: appliedCouponCode
    };
};


// For apply coupon logic
export const applyCouponLogic = async (userId, couponCode) => {
    const cart = await cartService.getUserCartData(userId);
    if (!cart || cart.items.length === 0) throw new Error("EMPTY_CART");
    const coupon = await checkoutRepository.findCouponByCode(couponCode);
    if (!coupon) throw new Error("INVALID_CODE");
    if (!coupon.isActive) throw new Error("INACTIVE_COUPON");
    if (new Date() > coupon.validTill) throw new Error("EXPIRED_COUPON");
    const userUsageRecord = coupon.usedBy.find(item => item.userId.toString() === userId.toString());
    if (userUsageRecord && userUsageRecord.count >= coupon.usageLimitPerUser) {
        throw new Error("USAGE_LIMIT_EXCEEDED");
    }
    let cartSubtotal = 0, totalTax = 0;
    cart.items.forEach(item => {
        const itemTotal = item.price * item.quantity;
        cartSubtotal += itemTotal;
        totalTax += (itemTotal * (item.taxRate || 0)) / 100;
    });
    if (cartSubtotal < coupon.minCartValue) {
        throw new Error(`MIN_CART_VALUE|${coupon.minCartValue - cartSubtotal}`);
    }
    let discountAmount = coupon.discountType === 'percentage'
        ? Math.min((cartSubtotal * coupon.discountValue) / 100, coupon.maxDiscount || Infinity)
        : coupon.discountValue;
    if (discountAmount > cartSubtotal) discountAmount = cartSubtotal;
    const activeOffers = typeof cartRepository.getActiveOffers === 'function' ? await cartRepository.getActiveOffers() : [];
    const now = new Date();
    const freeShippingOffer = activeOffers.find(offer =>
        (offer.type === 'Free Shipping' || offer.type === 'Free shipping') &&
        offer.targetType === 'Entire Order' &&
        offer.isManuallyActive &&
        now >= new Date(offer.startDate) &&
        now <= new Date(offer.endDate)
    );
    let shippingFee = SHIPPING_CONFIG.STANDARD_FEE;
    let preliminaryTotal = cartSubtotal + totalTax - discountAmount;
    if (preliminaryTotal >= SHIPPING_CONFIG.FREE_SHIPPING_THRESHOLD) {
        shippingFee = 0;
    } else if (freeShippingOffer && preliminaryTotal >= freeShippingOffer.discountValue) {
        shippingFee = 0;
    }
    const finalGrandTotal = cartSubtotal + totalTax + shippingFee - discountAmount;
    return { subTotal: cartSubtotal, tax: totalTax, shipping: shippingFee, discount: discountAmount, grandTotal: finalGrandTotal };
};


// For clear the coupon from the database
export const removeCouponLogic = async (userId) => {
    const cart = await checkoutRepository.findCartByUserIdDoc(userId);
    if (!cart) throw new Error("CART_NOT_FOUND");
    cart.appliedCoupon = null;
    cart.discountAmount = 0;
    await checkoutRepository.saveCartDocument(cart);
    let subTotal = 0, totalTax = 0;
    cart.items.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subTotal += itemTotal;
        totalTax += (itemTotal * (item.taxRate || 0)) / 100;
    });
    let discount = 0;
    let shippingFee = SHIPPING_CONFIG.STANDARD_FEE;
    if ((subTotal + totalTax) >= SHIPPING_CONFIG.FREE_SHIPPING_THRESHOLD) {
        shippingFee = 0;
    }
    const finalGrandTotal = subTotal + totalTax + shippingFee - discount;
    return { subTotal, tax: totalTax, shipping: shippingFee, discount, grandTotal: finalGrandTotal };
};


// For 'processing' the 'checkout'
export const processOrder = async (userId, selectedAddress, paymentMethod, sessionCouponCode) => {
    const cart = await cartService.getUserCartData(userId);
    if (!cart || cart.items.length === 0) throw new Error(CHECKOUT_ERRORS.CART_EMPTY);
    if (cart.hasInvalidItems) throw new Error(CHECKOUT_ERRORS.CART_INVALID_ITEMS);
    const fullAddress = await addressRepository.findAddressById(selectedAddress);
    if (!fullAddress) throw new Error(CHECKOUT_ERRORS.ADDRESS_NOT_FOUND);
    let subTotal = 0, totalTax = 0;
    const mappedItems = cart.items.map(item => {
        const billableQty = item.quantity - (item.freeQuantity || 0);
        const finalUnitPrice = item.effectivePrice !== undefined ? item.effectivePrice : item.price;
        const itemTotal = finalUnitPrice * billableQty;
        subTotal += itemTotal;
        totalTax += (itemTotal * (item.taxRate || 0)) / 100;
        return {
            product: item.product,
            variantId: item.variantId || item._id,
            variantName: item.variantName,
            variantSku: item.sku,
            quantity: item.quantity,
            price: finalUnitPrice,
            taxRate: item.taxRate || 0,
            comboId: item.comboOfferId ? item.comboOfferId.toString() : null
        };
    });
    let discount = 0;
    let appliedCouponId = null;
    if (sessionCouponCode) {
        const coupon = await checkoutRepository.findCouponByCode(sessionCouponCode);
        if (coupon && coupon.isActive && new Date() <= coupon.validTill && subTotal >= coupon.minCartValue) {
            appliedCouponId = coupon._id;
            discount = coupon.discountType === 'percentage'
                ? Math.min((subTotal * coupon.discountValue) / 100, coupon.maxDiscount || Infinity)
                : coupon.discountValue;
            if (discount > subTotal) discount = subTotal;
        }
    }
    let shipping = SHIPPING_CONFIG.STANDARD_FEE;
    let currentThreshold = SHIPPING_CONFIG.FREE_SHIPPING_THRESHOLD;
    if (typeof checkoutRepository.getActiveFreeShippingOffer === 'function') {
        const freeShippingOffer = await checkoutRepository.getActiveFreeShippingOffer();
        if (freeShippingOffer) {
            currentThreshold = freeShippingOffer.discountValue || 0;
        }
    }
    if ((subTotal + totalTax - discount) >= currentThreshold) {
        shipping = 0;
    }
    const finalGrandTotal = subTotal + totalTax + shipping - discount;
    let user;
    if (paymentMethod === 'wallet') {
        user = await checkoutRepository.findUserByIdDoc(userId);
        if (!user || user.walletBalance < finalGrandTotal) throw new Error(CHECKOUT_ERRORS.INSUFFICIENT_WALLET_BALANCE);
    }
    let formattedPaymentMethod = 'Credit Card';
    if (paymentMethod === 'cod') formattedPaymentMethod = 'COD';
    if (paymentMethod === 'razorpay') formattedPaymentMethod = 'Razorpay';
    if (paymentMethod === 'wallet') formattedPaymentMethod = 'Wallet';
    const newOrderData = {
        orderId: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        user: userId,
        items: mappedItems,
        shippingAddress: { fullName: fullAddress.fullName, addressLine: fullAddress.addressLine, city: fullAddress.city, state: fullAddress.state, pincode: fullAddress.pincode, phone: fullAddress.phone },
        paymentMethod: formattedPaymentMethod,
        paymentStatus: (['Razorpay', 'Credit Card', 'COD'].includes(formattedPaymentMethod)) ? 'Pending' : 'Paid',
        totalAmount: finalGrandTotal,
        appliedCoupon: appliedCouponId,
        discountAmount: discount || 0,
        deliveryStatus: 'Processing'
    };
    const savedOrder = await checkoutRepository.createOrder(newOrderData);
    if (paymentMethod === 'wallet') {
        user.walletBalance -= finalGrandTotal;
        await user.save();
        await checkoutRepository.logWalletTransaction({
            user: userId, transactionId: `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`, orderId: savedOrder._id, amount: finalGrandTotal, type: 'Debit', adjustmentType: 'Order Payment', reason: 'Order Payment', gateway: 'Wallet', balanceAfter: user.walletBalance, status: 'Success'
        });
    }
    let razorpayOrder = null;
    if (['razorpay', 'card'].includes(paymentMethod)) {
        razorpayOrder = await razorpayInstance.orders.create({
            amount: Math.round(finalGrandTotal * 100),
            currency: "INR",
            receipt: `receipt_${savedOrder._id}`
        });
    } else {
        for (let item of cart.items) {
            await checkoutRepository.deductProductStock(item.product, item.variantId || item.sku, item.quantity);
        }
        if (savedOrder.appliedCoupon) {
            await recordCouponUsage(savedOrder.appliedCoupon, userId);
        }
        await checkoutRepository.clearCartByUserId(userId);
        if (paymentMethod === 'cod') {
            const tempUser = await checkoutRepository.findUserByIdDoc(userId);
            await checkoutRepository.logWalletTransaction({
                user: userId,
                transactionId: `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                orderId: savedOrder._id,
                amount: finalGrandTotal,
                type: 'Debit',
                adjustmentType: 'Order Payment',
                reason: 'Cash on Delivery Order',
                gateway: 'COD',
                status: 'Pending',
                balanceAfter: tempUser.walletBalance || 0
            });
        }
    }
    return { order: savedOrder, razorpayOrder, finalPaymentMethod: paymentMethod === 'card' ? 'razorpay' : paymentMethod };
};


// For 'store' the data of 'coupon' for checks 'coupon' already 'used' or 'not' by 'user' 
export const recordCouponUsage = async (couponId, userId) => {
    try {
        if (!couponId) return;
        const coupon = await checkoutRepository.findCouponById(couponId);
        if (!coupon) return;
        const userIndex = coupon.usedBy.findIndex((item) => item.userId.toString() === userId.toString());
        if (userIndex > -1) {
            coupon.usedBy[userIndex].count += 1;
        } else {
            coupon.usedBy.push({ userId: userId, count: 1 });
        }
        coupon.markModified('usedBy');
        await checkoutRepository.saveCouponDocument(coupon);
    } catch (error) {
        console.error(" Error in recording coupon usage:", error);
    }
};


// For 'verify' 'razorpay' 'signature' ie act as 'security checkpoint' 
export const verifyRazorpaySignature = (orderId, paymentId, signature) => {
    const sign = orderId + "|" + paymentId;
    const expectedSign = crypto.createHmac("sha256", process.env.RAZORPAY_SECRET).update(sign.toString()).digest("hex");
    return signature === expectedSign;
};


// For 'clear' the 'cart' and 'reduce' the 'product variant' only for 'razorpay' and 'card' after 'verification'
export const finalizeOrderPayment = async (orderId, razorpayPaymentId, razorpayOrderId) => {
    const order = await checkoutRepository.findOrderByIdDoc(orderId);
    if (!order) throw new Error(CHECKOUT_ERRORS.ORDER_NOT_FOUND);
    order.paymentStatus = 'Paid';
    order.razorpayPaymentId = razorpayPaymentId;
    if (razorpayOrderId) {
        order.razorpayOrderId = razorpayOrderId;
    }
    await order.save();
    for (let item of order.items) {
        await checkoutRepository.deductProductStock(item.product, item.variantId || item.variantSku, item.quantity);
    }
    if (order.appliedCoupon) {
        await recordCouponUsage(order.appliedCoupon, order.user);
    }
    await checkoutRepository.clearCartByUserId(order.user);
    return true;
};


// For retrieve all data like 'delivery date', 'order number' etc for 'display' 'order success' page.
export const getOrderSuccessData = async (orderId) => {
    const order = await checkoutRepository.findOrderByIdLean(orderId);
    if (!order) return null;
    const deliveryDate = new Date(order.createdAt);
    deliveryDate.setDate(deliveryDate.getDate() + 5);
    const formattedDeliveryDate = deliveryDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    return { orderNumber: order.orderId, estimatedDelivery: formattedDeliveryDate, dbOrderId: order._id.toString() };
};


// For fetching an existing order to retry payment
export const getOrderByIdForRetry = async (orderId) => {
    const order = await checkoutRepository.findOrderByIdDoc(orderId);
    if (!order) throw new Error("Order not found");
    if (order.paymentStatus === 'Paid') throw new Error("Order is already paid.");
    if (order.deliveryStatus === 'Cancelled') throw new Error("Order has been cancelled.");
    return order;
};


// For generating a fresh Razorpay Session for an existing order
export const generateRazorpayOrder = async (orderId, totalAmount) => {
    const razorpayOrder = await razorpayInstance.orders.create({
        amount: Math.round(totalAmount * 100),
        currency: "INR",
        receipt: `retry_receipt_${orderId}`
    });
    return razorpayOrder;
};
















