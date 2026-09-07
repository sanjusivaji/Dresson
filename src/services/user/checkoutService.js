import * as checkoutRepository from '../../repository/user/checkoutRepository.js';
import * as addressRepository from '../../repository/user/userAddressRepository.js';
import * as cartService from './cartService.js';                                                       // 'cartService.js' file in same 'src/services/user' folder.
import { SHIPPING_CONFIG, CHECKOUT_ERRORS } from '../../constants/userCheckoutConstants.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_SECRET,
});


// For retrieve all data for 'checkout' like 'cart', 'address', total', 'coupon' et
export const getCheckoutPageData = async (userId, sessionCouponCode, directBuyCart = null) => {
    const cart = directBuyCart || await cartService.getUserCartData(userId);                                            
    const addresses = await addressRepository.findAddressesByUserId(userId);                               
    if (!cart || !cart.items || cart.items.length === 0) throw new Error(CHECKOUT_ERRORS.CART_EMPTY);
    if (cart.hasInvalidItems) throw new Error(CHECKOUT_ERRORS.CART_INVALID_ITEMS);    
    let subTotal = 0;
    let totalTax = 0;
    cart.items.forEach(item => {
        const itemTotalPrice = item.price * item.quantity;
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
    let shipping = SHIPPING_CONFIG.STANDARD_FEE; 
    let preliminaryTotal = subTotal + totalTax - discount;
    if (preliminaryTotal >= SHIPPING_CONFIG.FREE_SHIPPING_THRESHOLD) {
        discount += SHIPPING_CONFIG.STANDARD_FEE; 
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


// export const getCheckoutPageData = async (userId, sessionCouponCode) => {
//     const cart = await cartService.getUserCartData(userId);                                            
//     const addresses = await addressRepository.findAddressesByUserId(userId);                           
    
//     if (!cart || !cart.items || cart.items.length === 0) throw new Error(CHECKOUT_ERRORS.CART_EMPTY);
//     if (cart.hasInvalidItems) throw new Error(CHECKOUT_ERRORS.CART_INVALID_ITEMS);
    
//     let subTotal = 0;
//     let totalTax = 0;
//     cart.items.forEach(item => {
//         const itemTotalPrice = item.price * item.quantity;
//         subTotal += itemTotalPrice;
//         totalTax += (itemTotalPrice * (item.taxRate || 0)) / 100;
//     });

//     let discount = 0; 
//     let appliedCouponCode = null;
//     if (sessionCouponCode) {
//         const coupon = await checkoutRepository.findCouponByCode(sessionCouponCode);
        
//         if (coupon && coupon.isActive && new Date() <= coupon.validTill && subTotal >= coupon.minCartValue) {
//             appliedCouponCode = coupon.couponCode;
            
//             discount = coupon.discountType === 'percentage' 
//                 ? Math.min((subTotal * coupon.discountValue) / 100, coupon.maxDiscount || Infinity) 
//                 : coupon.discountValue;
                
//             if (discount > subTotal) discount = subTotal;
//         }
//         // Notice we DO NOT save anything to the cart DB here if it fails!
//     }
    
//     let shipping = SHIPPING_CONFIG.STANDARD_FEE; 
//     let preliminaryTotal = subTotal + totalTax - discount;
//     if (preliminaryTotal >= SHIPPING_CONFIG.FREE_SHIPPING_THRESHOLD) {
//         discount += SHIPPING_CONFIG.STANDARD_FEE; 
//     }
    
//     const grandTotal = subTotal + totalTax + shipping - discount;
//     const availableCoupons = await checkoutRepository.findActiveCoupons(new Date());                     
    
//     return { 
//         cart, 
//         addresses, 
//         totals: { subTotal, tax: totalTax, shipping, discount, grandTotal }, 
//         availableCoupons,
//         appliedCoupon: appliedCouponCode 
//     };
// };

export const applyCouponLogic = async (userId, couponCode) => {
    // 1. Just fetch the cart to get the subtotal
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
    
    let shippingFee = SHIPPING_CONFIG.STANDARD_FEE; 
    let preliminaryTotal = cartSubtotal + totalTax - discountAmount;
    if (preliminaryTotal >= SHIPPING_CONFIG.FREE_SHIPPING_THRESHOLD) discountAmount += SHIPPING_CONFIG.STANDARD_FEE;     
    
    const finalGrandTotal = cartSubtotal + totalTax + shippingFee - discountAmount;
    return { subTotal: cartSubtotal, tax: totalTax, shipping: shippingFee, discount: discountAmount, grandTotal: finalGrandTotal };
};


// export const getCheckoutPageData = async (userId) => {
//     const cart = await cartService.getUserCartData(userId);                                            
//     const addresses = await addressRepository.findAddressesByUserId(userId);                           
    
//     if (!cart || !cart.items || cart.items.length === 0) throw new Error(CHECKOUT_ERRORS.CART_EMPTY);
//     if (cart.hasInvalidItems) throw new Error(CHECKOUT_ERRORS.CART_INVALID_ITEMS);
    
//     let subTotal = 0;
//     let totalTax = 0;
//     cart.items.forEach(item => {
//         const itemTotalPrice = item.price * item.quantity;
//         subTotal += itemTotalPrice;
//         totalTax += (itemTotalPrice * (item.taxRate || 0)) / 100;
//     });
//     const rawCart = await checkoutRepository.findCartByUserIdDoc(userId);                                // Retrieve first matching 'cart' document based on 'userId'
//     console.log("rawCart", rawCart)
//     let discount = 0; 
//     let appliedCouponCode = null;
//     if (rawCart.appliedCoupon) {
//         const coupon = await checkoutRepository.findCouponById(rawCart.appliedCoupon);
        
//         // Check if coupon exists, is active, hasn't expired, and cart still meets minimum value
//         if (coupon && coupon.isActive && new Date() <= coupon.validTill && subTotal >= coupon.minCartValue) {
            
//             appliedCouponCode = coupon.couponCode;
            
//             // Recalculate the exact discount dynamically
//             discount = coupon.discountType === 'percentage' 
//                 ? Math.min((subTotal * coupon.discountValue) / 100, coupon.maxDiscount || Infinity) 
//                 : coupon.discountValue;
                
//             if (discount > subTotal) discount = subTotal;
            
//             // If the cart quantities changed, update the saved discount in the DB quietly
//             if (rawCart.discountAmount !== discount) {
//                 rawCart.discountAmount = discount;
//                 await checkoutRepository.saveCartDocument(rawCart);
//             }
//         } else {
//             // The coupon is no longer valid (e.g., cart value dropped). Clear it automatically!
//             rawCart.appliedCoupon = null;
//             rawCart.discountAmount = 0;
//             await checkoutRepository.saveCartDocument(rawCart);
//         }
//     }
    
//     let shipping = SHIPPING_CONFIG.STANDARD_FEE; 
//     let preliminaryTotal = subTotal + totalTax - discount;
//     if (preliminaryTotal >= SHIPPING_CONFIG.FREE_SHIPPING_THRESHOLD) {
//         discount += SHIPPING_CONFIG.STANDARD_FEE; 
//     }
    
//     const grandTotal = subTotal + totalTax + shipping - discount;
//     const availableCoupons = await checkoutRepository.findActiveCoupons(new Date());                     
//     //console.log(appliedCouponCode)
//     return { 
//         cart, 
//         addresses, 
//         totals: { subTotal, tax: totalTax, shipping, discount, grandTotal }, 
//         availableCoupons,
//         appliedCoupon: appliedCouponCode 
//     };
// };


// // For 'check' 'coupon' is valid or not and calculate 'subtotal' after applying 'coupon'.
// export const applyCouponLogic = async (userId, couponCode) => {
//     const cart = await checkoutRepository.findCartByUserIdDoc(userId);       // Retrieve first matching 'cart' document based on 'userId'                  
//     if (!cart || cart.items.length === 0) throw new Error("EMPTY_CART");        
//     const coupon = await checkoutRepository.findCouponByCode(couponCode);    // Retrieve 'coupon' details based on 'couponCode'(Eg,'WELCOME50')                  
//     if (!coupon) throw new Error("INVALID_CODE");
//     if (!coupon.isActive) throw new Error("INACTIVE_COUPON");
//     if (new Date() > coupon.validTill) throw new Error("EXPIRED_COUPON");   
//     const userUsageRecord = coupon.usedBy.find(                             // Here 'find()' return all document(ie includes 'count' like properties) based on 'userId' 
//         (item) => item.userId.toString() === userId.toString()
//     );
//     if (userUsageRecord && userUsageRecord.count >= coupon.usageLimitPerUser) {
//         throw new Error("USAGE_LIMIT_EXCEEDED");
//     }
//     let cartSubtotal = 0, totalTax = 0; 
//     cart.items.forEach(item => {
//         const itemTotal = item.price * item.quantity; 
//         cartSubtotal += itemTotal; 
//         totalTax += (itemTotal * (item.taxRate || 0)) / 100; 
//     });    
//     if (cartSubtotal < coupon.minCartValue) {
//         throw new Error(`MIN_CART_VALUE|${coupon.minCartValue - cartSubtotal}`); // If 'cartSubtotal' value less than the value that apply for 'coupon'(ie 'coupon.minCartValue') then we need to display this a 'message' for 'user' so here we 'throw' an 'error' with 'MIN_CART_VALUE' and how much want to reach 'MIN_CART_VALUE'(ie 'coupon.minCartValue - cartSubtotal' in template literals)
//     }
//     let discountAmount = coupon.discountType === 'percentage'                    // If 'discountType' is 'percentage' then we calculate 'discountValue' other wise(ie 'amount' instead 'percentage)we directly put 'discountValue'.
//         ? Math.min((cartSubtotal * coupon.discountValue) / 100, coupon.maxDiscount || Infinity) 
//         : coupon.discountValue;        
//     if (discountAmount > cartSubtotal) discountAmount = cartSubtotal;        
//     let preliminaryTotal = cartSubtotal + totalTax - discountAmount;
//     let shippingFee = SHIPPING_CONFIG.STANDARD_FEE; 
//     if (preliminaryTotal >= SHIPPING_CONFIG.FREE_SHIPPING_THRESHOLD) discountAmount += SHIPPING_CONFIG.STANDARD_FEE;     
//     const finalGrandTotal = cartSubtotal + totalTax + shippingFee - discountAmount;
//     cart.appliedCoupon = coupon._id;       
//     cart.discountAmount = discountAmount;  
//     await checkoutRepository.saveCartDocument(cart);                      // For 'save' 'cart' document in 'cart' collection
//     return { subTotal: cartSubtotal, tax: totalTax, shipping: shippingFee, discount: discountAmount, grandTotal: finalGrandTotal };
// };


// ADD THIS NEW FUNCTION to clear the coupon from the database
export const removeCouponLogic = async (userId) => {
    const cart = await checkoutRepository.findCartByUserIdDoc(userId);
    if (!cart) throw new Error("CART_NOT_FOUND");
    cart.appliedCoupon = null;
    cart.discountAmount = 0;
    await checkoutRepository.saveCartDocument(cart);

    // Recalculate base totals without the coupon
    let subTotal = 0, totalTax = 0;
    cart.items.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subTotal += itemTotal;
        totalTax += (itemTotal * (item.taxRate || 0)) / 100;
    });

    let discount = 0;
    let shippingFee = SHIPPING_CONFIG.STANDARD_FEE;
    if ((subTotal + totalTax) >= SHIPPING_CONFIG.FREE_SHIPPING_THRESHOLD) {
        discount += SHIPPING_CONFIG.STANDARD_FEE;
    }
    const finalGrandTotal = subTotal + totalTax + shippingFee - discount;

    return { subTotal, tax: totalTax, shipping: shippingFee, discount, grandTotal: finalGrandTotal };
};


// export const getCheckoutPageData = async (userId) => {
//     const cart = await cartService.getUserCartData(userId);                                            // For 'cross checking' the data in 'cart' and 'recreate' it based on 'userId'.
//     //console.log(cart)
//     const addresses = await addressRepository.findAddressesByUserId(userId);                           // For retrieve 'address' of each 'user' by their 'userId'
//     if (!cart || !cart.items || cart.items.length === 0) throw new Error(CHECKOUT_ERRORS.CART_EMPTY);
//     if (cart.hasInvalidItems) throw new Error(CHECKOUT_ERRORS.CART_INVALID_ITEMS);
//     let subTotal = 0;
//     let totalTax = 0;
//     cart.items.forEach(item => {
//         const itemTotalPrice = item.price * item.quantity;
//         subTotal += itemTotalPrice;
//         totalTax += (itemTotalPrice * (item.taxRate || 0)) / 100;
//     });
//     let discount = 0; 
//     let shipping = SHIPPING_CONFIG.STANDARD_FEE; 
//     let preliminaryTotal = subTotal + totalTax - discount;
//     if (preliminaryTotal >= SHIPPING_CONFIG.FREE_SHIPPING_THRESHOLD) {
//         discount += SHIPPING_CONFIG.STANDARD_FEE; 
//     }
//     const grandTotal = subTotal + totalTax + shipping - discount;
//     const availableCoupons = await checkoutRepository.findActiveCoupons(new Date());                     // Retrieve only 'active' 'coupon' only based on 'currentDate'
//     // console.log(availableCoupons)
//     return { cart, addresses, totals: { subTotal, tax: totalTax, shipping, discount, grandTotal }, availableCoupons };
// };



// For 'processing' the 'checkout'
export const processOrder = async (userId, selectedAddress, paymentMethod, sessionCouponCode) => {
    const cart = await cartService.getUserCartData(userId);                                             // For 'cross checking' the data in 'cart' and 'recreate' it based on 'userId'.                    
    if (!cart || cart.items.length === 0) throw new Error(CHECKOUT_ERRORS.CART_EMPTY);
    if (cart.hasInvalidItems) throw new Error(CHECKOUT_ERRORS.CART_INVALID_ITEMS);                      // 'hasInvalidItems:true' get from 'cartService'                  
    const fullAddress = await addressRepository.findAddressById(selectedAddress);                       // For retrieve 'one' address id for 'edit' and 'delete' purpose             
    if (!fullAddress) throw new Error(CHECKOUT_ERRORS.ADDRESS_NOT_FOUND);        
    let subTotal = 0, totalTax = 0;    
    const mappedItems = cart.items.map(item => {
        const itemTotal = item.price * item.quantity;
        subTotal += itemTotal;
        totalTax += (itemTotal * (item.taxRate || 0)) / 100;
        return { product: item.product, variantName: item.variantName, variantSku: item.sku, quantity: item.quantity, price: item.price, taxRate: item.taxRate || 0 , comboId: item.comboOfferId ? item.comboOfferId.toString() : null};
    });    
    let discount = 0;
    let appliedCouponId = null;

    if (sessionCouponCode) {
        const coupon = await checkoutRepository.findCouponByCode(sessionCouponCode);
        // Double-check validity one last time before processing the order
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

    if ((subTotal + totalTax - discount) >= currentThreshold) discount += SHIPPING_CONFIG.STANDARD_FEE;      
    const finalGrandTotal = subTotal + totalTax + shipping - discount;
    
    let user;        
    if (paymentMethod === 'wallet') {
        user = await checkoutRepository.findUserByIdDoc(userId);                                        // Retrieve 'user' data based on 'userId' and it includes 'walletBalance'(ie because we add 'walletBalance' field in 'user' model).        
        if (!user || user.walletBalance < finalGrandTotal) throw new Error(CHECKOUT_ERRORS.INSUFFICIENT_WALLET_BALANCE); // Checks 'walletBalance' has enough 'balance' amount.
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
        appliedCoupon: appliedCouponId, // ✨ UPDATED: Uses the ID we extracted from the session coupon
        discountAmount: discount || 0,        
        deliveryStatus: 'Processing'
    };                
    const savedOrder = await checkoutRepository.createOrder(newOrderData);                                  // For creates a new 'document' in 'order' collection based on 'orderData'                    
    if (paymentMethod === 'wallet') {
        user.walletBalance -= finalGrandTotal;
        await user.save();
        await checkoutRepository.logWalletTransaction({                                                     // For creates a new 'document' in 'walletTransaction' collection based on 'transactionData'
            user: userId, transactionId: `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`, orderId: savedOrder._id, amount: finalGrandTotal, type: 'Debit', adjustmentType: 'Order Payment', reason: 'Order Payment', gateway: 'Wallet', balanceAfter: user.walletBalance, status: 'Success'
        });
    }       
    
    let razorpayOrder = null;
    if (['razorpay', 'card'].includes(paymentMethod)) {                                                  // Here '[ ]'(ie 'array literals')used for create a new array and when 'user' select 'paymentMethod' is 'razorpay' and 'includes()'(ie the built-in 'js' method)return 'true' and then 'if condition' alos return 'true'.                             
        razorpayOrder = await razorpayInstance.orders.create({                                           // Here 'razorpayInstance' is created at top from 'new Razorpay()
            amount: Math.round(finalGrandTotal * 100),
            currency: "INR",
            receipt: `receipt_${savedOrder._id}`
        });
    } else {                                                                                             // In 'else' case we handle 'COD'(Cash on Delivery) and 'Wallet' payments ie here we done 'clear' the 'cart' and 'reduce' the 'product variant'(ie this activity done in the case of 'razorpay' or 'card' in 'verifyPayment()' in 'checkoutController.js' file  ie it happens only after 'verification') below.              
        for (let item of cart.items) {
            await checkoutRepository.deductProductStock(item.product, item.sku || item.variantId, item.quantity);  // For 'reduce' the 'quantity' of  exact 'variant' from the product array and we doing these only in 'wallet' and 'COD' because in the case of 'razorpay' and 'Credit/Debit card' it done other function.
        }       
        
        // ✨ UPDATED: Now looks at `savedOrder.appliedCoupon` instead of `rawCart.appliedCoupon`
        if (savedOrder.appliedCoupon) {
            await recordCouponUsage(savedOrder.appliedCoupon, userId);                                      // It used for add 'userId' and its 'count' into 'usedBy' array.                
        }
        
        await checkoutRepository.clearCartByUserId(userId);                                              // For 'emptying' 'cart' by 'userId'(uses in 'checkout' time)            
        if (paymentMethod === 'cod') {
            const tempUser = await checkoutRepository.findUserByIdDoc(userId);                   // Retrieve 'user' data based on 'userId' and it includes 'walletBalance'(ie because we add 'walletBalance' field in 'user' model).         
            await checkoutRepository.logWalletTransaction({                                      // For creates a new 'document' in 'walletTransaction' collection based on 'transactionData'
                user: userId,
                transactionId: `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                orderId: savedOrder._id,
                amount: finalGrandTotal,
                type: 'Debit',
                adjustmentType: 'Order Payment',
                reason: 'Cash on Delivery Order',
                gateway: 'COD',
                status: 'Pending',                                                                // Pending because they haven't paid the delivery driver yet!
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

// export const recordCouponUsage = async (couponId, userId) => {
//     if (!couponId) return; 
//     const coupon = await checkoutRepository.findCouponById(couponId);  // It retrieve 'coupon' details based on 'couponId'(ie 'couponId' created 'mongodb' only after using 'coupon' and it is faster than 'string')
//     // console.log(coupon)
//     if (!coupon) return;
//     const userIndex = coupon.usedBy.findIndex((item) => item.userId.toString() === userId.toString() );  // Here 'coupon.usedBy' is an 'array' and here we iterate 'coupon.usedBy' by using 'findIndex()' for find the 'index' only if both 'userId' of 'usedBy' array and given 'userId' are same and if both are 'not' same 'findIndex()' return '-1'(ie 'user' not added to 'usedBy' array yet)so it goes to 'else' case and 'push' / 'add' the object ie '{ userId: userId, count: 1 }' and if 'userId'/ user 'already' in 'usedBy' array we just increase the 'count'(ie 'coupon.usedBy[userIndex].count += 1').
//     if (userIndex > -1) {
//         coupon.usedBy[userIndex].count += 1;
//     } else {
//         coupon.usedBy.push({ userId: userId, count: 1 });
//     }
//     await checkoutRepository.saveCouponDocument(coupon);
// };


// For 'verify' 'razorpay' 'signature' ie act as 'security checkpoint' 
export const verifyRazorpaySignature = (orderId, paymentId, signature) => {
    const sign = orderId + "|" + paymentId;                                                 // Here 'joining' together with middle '|' symbol.
    const expectedSign = crypto.createHmac("sha256", process.env.RAZORPAY_SECRET).update(sign.toString()).digest("hex"); // Joining string 'hashed' by using 'RAZORPAY_SECRET'.
    return signature === expectedSign;                                                      // Here 'signature' passes as 'argument' and created in 'razorpay' server by this same mechanism(ie 'join' 'orderId' and 'paymentId' and then hash it)when 'bank' approves 'customer payment' and 'razorpay' bundle it together with the 'razorpay_payment_id' send to 'front end' then 'front end' send it to 'backend'.
};




// For 'clear' the 'cart' and 'reduce' the 'product variant' only for 'razorpay' and 'card' after 'verification'
export const finalizeOrderPayment = async (orderId) => {
    const order = await checkoutRepository.findOrderByIdDoc(orderId);                       
    if (!order) throw new Error(CHECKOUT_ERRORS.ORDER_NOT_FOUND);
    
    order.paymentStatus = 'Paid'; 
    await order.save();
    for (let item of order.items) {
        await checkoutRepository.deductProductStock(item.product, item.variantSku, item.quantity);
    }
    
    // ✨ 2. Record Coupon Usage (Reading directly from the saved Order Document!)
    if (order.appliedCoupon) {
        await recordCouponUsage(order.appliedCoupon, order.user);
    }

    // 3. Clear Cart
    await checkoutRepository.clearCartByUserId(order.user);                                
    
    // 4. Log Wallet Transaction for the gateway
    const user = await checkoutRepository.findUserByIdDoc(order.user); 
    await checkoutRepository.logWalletTransaction({
        user: order.user,
        transactionId: `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        orderId: order._id,
        amount: order.totalAmount,
        type: 'Debit',
        adjustmentType: 'Order Payment',
        reason: 'Online Payment (Razorpay)',
        gateway: 'Razorpay',
        status: 'Success',                                                                
        balanceAfter: user.walletBalance || 0
    });
    
    return true;
};

// export const finalizeOrderPayment = async (orderId) => {
//     const order = await checkoutRepository.findOrderByIdDoc(orderId);                       // Retrieve 'User' data based on 'orderId'
//     if (!order) throw new Error(CHECKOUT_ERRORS.ORDER_NOT_FOUND);
//     order.paymentStatus = 'Paid'; 
//     await order.save();
//     for (let item of order.items) {
//         await checkoutRepository.deductProductStock(item.product, item.variantSku, item.quantity);// For 'reduce' the 'quantity' of  exact variant from the product array
//     }
//     await checkoutRepository.clearCartByUserId(order.user);                                // For 'emptying' 'cart' by 'userId'(uses in 'checkout' time)
//     const user = await checkoutRepository.findUserByIdDoc(order.user); 
//     await checkoutRepository.logWalletTransaction({
//         user: order.user,
//         transactionId: `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
//         orderId: order._id,
//         amount: order.totalAmount,
//         type: 'Debit',
//         adjustmentType: 'Order Payment',
//         reason: 'Online Payment (Razorpay)',
//         gateway: 'Razorpay',
//         status: 'Success',                                                                // The payment was verified by Razorpay
//         balanceAfter: user.walletBalance || 0
//     });
//     return true;
// };


// For retrieve all data like 'delivery date', 'order number' etc for 'display' 'order success' page.
export const getOrderSuccessData = async (orderId) => {
    const order = await checkoutRepository.findOrderByIdLean(orderId); // Retrieve 'order' data based on 'orderId' and 'lean' only for 'display' it.
    if (!order) return null;
    const deliveryDate = new Date(order.createdAt);
    deliveryDate.setDate(deliveryDate.getDate() + 5);
    const formattedDeliveryDate = deliveryDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    return { orderNumber: order.orderId, estimatedDelivery: formattedDeliveryDate, dbOrderId: order._id.toString() };
};


