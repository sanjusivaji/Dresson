export const SHIPPING_CONFIG = {
    STANDARD_FEE: 150,
    FREE_SHIPPING_THRESHOLD: 1500,
    DEFAULT_TAX_RATE: 12
};

export const CHECKOUT_ERRORS = {
    CART_EMPTY: "CART_EMPTY",
    CART_INVALID_ITEMS: "CART_INVALID_ITEMS",
    ADDRESS_NOT_FOUND: "ADDRESS_NOT_FOUND",
    INSUFFICIENT_WALLET_BALANCE: "INSUFFICIENT_WALLET_BALANCE",
    ORDER_NOT_FOUND: "ORDER_NOT_FOUND"
};

export const COUPON_MESSAGES = {
    UNAUTHORIZED: "Please log in to apply a coupon.",
    MISSING_CODE: "Please enter a coupon code.",
    EMPTY_CART: "Your cart is empty.",
    INVALID_CODE: "Invalid coupon code.",
    INACTIVE_COUPON: "This coupon is currently inactive.",
    EXPIRED_COUPON: "This coupon has expired.",
    SUCCESS: "Coupon applied successfully!",
    SERVER_ERROR: "Could not apply coupon at this time.",
    MIN_CART_VALUE: (shortfall) => `Add ₹${shortfall} more to your cart to use this coupon.`
};