
export const SHOP_CONSTANTS = {
    //  PAGINATION DEFAULTS
    DEFAULT_PAGE_LIMIT: 3,        // Displays exactly 3 products per page as requested
    MAX_PAGE_LIMIT: 24,           // Upper boundary to prevent database overload
    
    //  PRICE FILTERING DEFAULTS (In INR ₹)
    DEFAULT_MIN_PRICE: 0,
    DEFAULT_MAX_PRICE: 5000,      // Matches your Figma UI slider limit (₹5,000)
    ABSOLUTE_MAX_PRICE: 100000,   // Highest possible price allowed in filter
    
    // PRODUCT ATTRIBUTES & FALLBACKS
    DEFAULT_SORT: 'newest',       // Default sorting option when none is selected
    DEFAULT_FABRIC: 'General Blend',
    DEFAULT_COLOR: 'Multi',
    
    //  CART & ORDER LIMITS
    MAX_QTY_PER_ITEM: 10,         // Maximum units allowed per SKU in shopping cart
    LOW_STOCK_THRESHOLD: 5,       // Triggers "Only X Left!" urgency badge on UI
    
    //  SHIPPING & TAX RULES
    FREE_SHIPPING_THRESHOLD: 1499,// Free shipping on orders above ₹1,499
    STANDARD_SHIPPING_FEE: 99,    // Flat ₹99 shipping charge below threshold
    TAX_RATE_PERCENT: 18          // Standard GST 18% for apparel in India
};

// You can also add Order Status constants here later for your admin dashboard!
export const ORDER_STATUS = {
    PENDING: 'Pending',
    PROCESSING: 'Processing',
    SHIPPED: 'Shipped',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
    RETURNED: 'Returned'
};