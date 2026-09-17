
export const SHOP_CONSTANTS = {
    DEFAULT_PAGE_LIMIT: 3,        // Displays exactly 3 products per page as requested
    MAX_PAGE_LIMIT: 24,           
    
    DEFAULT_MIN_PRICE: 0,
    DEFAULT_MAX_PRICE: 5000,      
    ABSOLUTE_MAX_PRICE: 100000,   // Highest possible price allowed in filter

    DEFAULT_SORT: 'newest',       
    DEFAULT_FABRIC: 'General Blend',
    DEFAULT_COLOR: 'Multi',
    
    MAX_QTY_PER_ITEM: 10,         // Maximum units allowed per SKU in shopping cart
    LOW_STOCK_THRESHOLD: 5,       // Triggers "Only X Left!" urgency badge on UI
    

    FREE_SHIPPING_THRESHOLD: 1499,
    STANDARD_SHIPPING_FEE: 150,   
    TAX_RATE_PERCENT: 18          
};

export const ORDER_STATUS = {
    PENDING: 'Pending',
    PROCESSING: 'Processing',
    SHIPPED: 'Shipped',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
    RETURNED: 'Returned'
};