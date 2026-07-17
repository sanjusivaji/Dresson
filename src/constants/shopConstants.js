export const SHOP_CONSTANTS = {
    DEFAULT_PAGE_LIMIT: 9, // 3 columns x 3 rows grid
    DEFAULT_MAX_PRICE: 5000,
    SORT_MAPPINGS: {
        'price_asc': { 'variants.0.price': 1 },
        'price_desc': { 'variants.0.price': -1 },
        'alpha_asc': { name: 1 },
        'alpha_desc': { name: -1 },
        'newest': { createdAt: -1 }
    }
};