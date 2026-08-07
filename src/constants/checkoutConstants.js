export const CHECKOUT_MESSAGES = {
    CART_EMPTY: "Your cart is empty. Please add items to checkout.",
    ADDRESS_REQUIRED: "Please select a delivery address.",
    PAYMENT_REQUIRED: "Please select a payment method.",
    ORDER_SUCCESS: "Order placed successfully!",
    ORDER_FAILED: "Failed to place the order. Please try again.",
    STOCK_UNAVAILABLE: "Some items in your cart are currently out of stock.",
    FETCH_ERROR: "Could not load the checkout page."
};

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