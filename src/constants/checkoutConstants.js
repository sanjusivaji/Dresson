

export const PAYMENT_METHODS = {
    COD: 'cod',
    RAZORPAY: 'razorpay',
    CARD: 'card',
    WALLET: 'wallet'
};

export const ORDER_STATUS = {
    PENDING: 'Pending',
    PROCESSING: 'Processing',
    SHIPPED: 'Shipped',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled'
};


export const CHECKOUT_MESSAGES = {
    ADDRESS_REQUIRED: "Please select a delivery address.",
    PAYMENT_REQUIRED: "Please select a payment method.",
    ORDER_SUCCESS: "Order placed successfully!",
    ORDER_FAILED: "Could not process your order at this time."
};

//  Coupon Specific Messages
export const COUPON_MESSAGES = {
    UNAUTHORIZED: "Please log in to apply coupons.",
    MISSING_CODE: "Please provide a coupon code.",
    EMPTY_CART: "Your cart is empty.",
    INVALID_CODE: "Invalid coupon code.",
    INACTIVE_COUPON: "This coupon is no longer active.",
    EXPIRED_COUPON: "This coupon has expired.",
    MIN_CART_VALUE: (shortfall) => `Add ₹${shortfall} more to your cart to use this coupon.`, // We use a function here to handle the dynamic math insertion
    SUCCESS: "Coupon applied successfully!",
    SERVER_ERROR: "An error occurred while applying the coupon."
};

//  Shipping Business Rules
export const SHIPPING_CONFIG = {
    STANDARD_FEE: 150,
    FREE_SHIPPING_THRESHOLD: 1500
};