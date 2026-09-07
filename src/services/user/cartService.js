import * as cartRepository from '../../repository/user/cartRepository.js';
import { CART_CONFIG, CART_MESSAGES } from '../../constants/cartConstants.js';


const applyBuyXGetYOffer = (item, liveProduct, quantity, activeOffers = []) => {
    let effectivePrice = item.livePrice !== undefined ? item.livePrice : item.price;
    let freeQuantity = 0;

    // Find active 'Buy X, Get Y' offer from the separate offers collection matching this product
    const matchingOffer = activeOffers.find(offer => 
        offer.type === 'Buy X, Get Y' && 
        offer.isManuallyActive &&
        offer.targetIds.some(id => id.toString() === liveProduct._id.toString())
    );

    if (matchingOffer) {
        // Assuming standard Buy 1 Get 1 or configured via offer fields (defaulting to Buy 1 Get 1 if parameters are implicit)
        const buyQty = matchingOffer.buyQty || 1;
        const getQty = matchingOffer.getQty || 1;
        
        if (quantity >= (buyQty + getQty)) {
            // Calculate how many sets of the offer are achieved
            const sets = Math.floor(quantity / (buyQty + getQty));
            const totalFreeItems = sets * getQty;
            freeQuantity = totalFreeItems;
        }
    }
    return { effectivePrice, freeQuantity };
};

// For 'cross checking' the data in 'cart' and 'recreate' it
export const getUserCartData = async (userId) => {
    const cart = await cartRepository.getCartPopulatedForDisplay(userId);                                    // In 'cart' contains 'cartId', 'userId', 'items' array(ie it contains all details about 'product' in object, 'product name', 'id', 'quantity','image', 'price', 'sku' etc).
    if (!cart) {
        return { items: [], cartTotal: 0, hasInvalidItems: false };
    }

    // Fetch active offers from database to properly evaluate collection-based offers
    const activeOffers = typeof cartRepository.getActiveOffers === 'function' 
        ? await cartRepository.getActiveOffers() 
        : [];

    let calculatedTotal = 0;
    let hasInvalidItems = false;
    const reconciledItems = [];                                                                                // Array declared 'outside' forloop.
    
    for (const item of cart.items) {
        const liveProduct = item.product;                                                                    // Here we iterate 'cart.items'(ie 'items' is the array inside 'cart' object)and inside 'items' array contains 'product' named object and inside 'product' have 'name',brand', 'variants'(it contains 'size', 'color', 'sku' etc) array, 'total stock' etc.
        const isUnlisted = !liveProduct || !liveProduct.isListed;   
        
        let liveStock = 0;
        let savedPrice = item.price; // The price currently saved in the cart document (crucial for pro-rated combo prices)
        let retailPrice = item.price; 
        
        if (liveProduct && liveProduct.variants) {                                                             // Here we check is 'product'(ie 'liveProduct')and 'product' has 'variant'(ie 'liveProduct.variants')
            const liveVariant = liveProduct.variants.find(v => v._id.toString() === item.variantId.toString());
            if (liveVariant) {
                liveStock = liveVariant.stock;
                retailPrice = liveVariant.price;
                if (liveProduct.discount > 0) {
                    retailPrice = Math.round(liveVariant.price * (1 - (liveProduct.discount / 100)));
                }
            }
        }

        // NEW: Create a bulletproof combo flag (checks for the ID OR if the saved price is heavily discounted compared to retail)
        const isComboItem = !!item.comboOfferId || (savedPrice < retailPrice && savedPrice > 0);
        
        // If it's a combo item, lock in the saved prorated price. Otherwise, update to current retail price.
        let currentLivePrice = isComboItem ? savedPrice : retailPrice;
        
        // Apply Buy X Get Y Offer calculation adjustments on pricing/quantities using database offers
        let adjustedPrice = currentLivePrice;
        let freeQty = 0;
        
        if (!isComboItem) {
            const matchingOffer = activeOffers.find(offer => 
                offer.type === 'Buy X, Get Y' && 
                offer.isManuallyActive &&
                offer.targetIds.some(id => id.toString() === liveProduct._id.toString())
            );

            if (matchingOffer) {
                const buyQty = matchingOffer.buyQty || 1;
                const getQty = matchingOffer.getQty || 1;
                if (item.quantity >= (buyQty + getQty)) {
                    const sets = Math.floor(item.quantity / (buyQty + getQty));
                    freeQty = sets * getQty;
                    // Total price is calculated only for the paid items (quantity minus free promotional items)
                    const paidQuantity = item.quantity - freeQty;
                    adjustedPrice = Math.round((currentLivePrice * paidQuantity) / item.quantity);
                }
            }
        }

        const isOutOfStock = liveStock === 0;
        const isExceedingStock = item.quantity > liveStock;
        
        // NEW: Determine which price to actually charge the user
        const effectivePrice = isComboItem ? savedPrice : adjustedPrice;
        
        if (isUnlisted || isOutOfStock || isExceedingStock) {
            hasInvalidItems = true;
        } else {
            // FIX: Charge the effectivePrice, not the standard livePrice
            calculatedTotal += (effectivePrice * (item.quantity - freeQty)); 
        }
        
        // Safely extract document data if it's a mongoose object to allow spreading
        const itemData = item.toObject ? item.toObject() : item;

        reconciledItems.push({
            ...itemData,
            livePrice: retailPrice, // Send the true retail price for the EJS strikethrough visual
            effectivePrice,         // The actual price to display in green and charge
            isComboItem,            // Explicit flag for EJS to use for badges/locking
            adjustedPrice,          // Include offer-adjusted price per unit or weighted average
            freeQuantity: freeQty,  // Track free items granted via Buy X Get Y
            liveStock,
            isUnlisted,
            isOutOfStock,
            isExceedingStock,
            isValid: !isUnlisted && !isOutOfStock && !isExceedingStock
        });
    }
    
    return {
        _id: cart._id,
        items: reconciledItems,
        cartTotal: calculatedTotal,
        hasInvalidItems 
    };
};

// export const getUserCartData = async (userId) => {
//     const cart = await cartRepository.getCartPopulatedForDisplay(userId);                                    // In 'cart' contains 'cartId', 'userId', 'items' array(ie it contains all details about 'product' in object, 'product name', 'id', 'quantity','image', 'price', 'sku' etc).
//     if (!cart) {
//         return { items: [], cartTotal: 0, hasInvalidItems: false };
//     }
//     let calculatedTotal = 0;
//     let hasInvalidItems = false;
//     const reconciledItems = [];                                                                                // Array declared 'outside' forloop.
//     for (const item of cart.items) {
//         const liveProduct = item.product;                                                                    // Here we iterate 'cart.items'(ie 'items' is the array inside 'cart' object)and inside 'items' array contains 'product' named object and inside 'product' have 'name',brand', 'variants'(it contains 'size', 'color', 'sku' etc) array, 'total stock' etc.
//         const isUnlisted = !liveProduct || !liveProduct.isListed;   
//         let liveStock = 0;
//         let livePrice = item.price;
//         if (liveProduct && liveProduct.variants) {                                                             // Here we check is 'product'(ie 'liveProduct')and 'product' has 'variant'(ie 'liveProduct.variants')
//             const liveVariant = liveProduct.variants.find(v => v._id.toString() === item.variantId.toString());
//             if (liveVariant) {
//                 liveStock = liveVariant.stock;
//                 livePrice = liveVariant.price;
//                 if (liveProduct.discount > 0) {
//                     livePrice = Math.round(liveVariant.price * (1 - (liveProduct.discount / 100)));
//                 }
//             }
//         }
        
//         // Apply Buy X Get Y Offer calculation adjustments on pricing/quantities
//         let adjustedPrice = livePrice;
//         let freeQty = 0;
//         if (liveProduct && liveProduct.buyXGetYOffer && liveProduct.buyXGetYOffer.isActive) {
//             const { buyQty, getQty } = liveProduct.buyXGetYOffer;
//             if (buyQty > 0 && getQty > 0 && item.quantity >= (buyQty + getQty)) {
//                 const sets = Math.floor(item.quantity / (buyQty + getQty));
//                 freeQty = sets * getQty;
//                 // Total price is calculated only for the paid items (quantity minus free promotional items)
//                 const paidQuantity = item.quantity - freeQty;
//                 adjustedPrice = Math.round((livePrice * paidQuantity) / item.quantity);
//             }
//         }

//         const isOutOfStock = liveStock === 0;
//         const isExceedingStock = item.quantity > liveStock;
//         if (isUnlisted || isOutOfStock || isExceedingStock) {
//             hasInvalidItems = true;
//         } else {
//             calculatedTotal += (livePrice * (item.quantity - freeQty)); // Charge only for non-free items in Buy X Get Y
//         }
//         reconciledItems.push({
//             ...item,
//             livePrice,
//             adjustedPrice, // Include offer-adjusted price per unit or weighted average
//             freeQuantity: freeQty, // Track free items granted via Buy X Get Y
//             liveStock,
//             isUnlisted,
//             isOutOfStock,
//             isExceedingStock,
//             isValid: !isUnlisted && !isOutOfStock && !isExceedingStock
//         });
//     }
//     return {
//         _id: cart._id,
//         items: reconciledItems,
//         cartTotal: calculatedTotal,
//         hasInvalidItems 
//     };
// };



// // For get single 'cart' document,create a 'empty' cart document, add 'new' quantity , calculate 'final price' and 'save' this into 'data base' and 'remove' product from 'wishlist'. 
export const addItemToCart = async (userId, productId, variantId, requestedQty = 1) => {
    const product = await cartRepository.getActiveProductById(productId);                     // Retrieve 'single' product(ie it is an array contains 'name', 'variants' like data) based on 'productId' and 'isListed: true'
    if (!product) throw new Error(CART_MESSAGES.PRODUCT_UNAVAILABLE);                         
    const variant = product.variants.find(item => item._id.toString() === variantId.toString());
    if (!variant) throw new Error(CART_MESSAGES.VARIANT_NOT_FOUND);   
    if (variant.stock === 0) throw new Error(CART_MESSAGES.SOLD_OUT);   
    
    let finalPrice = variant.price;
    if (product.discount > 0) {
        finalPrice = Math.round(variant.price * (1 - (product.discount / 100)));
    }   

    let qtyToAdd = parseInt(requestedQty) || 1;   

    // NEW: Fetch offers and check for automatic quantity bump
    const activeOffers = typeof cartRepository.getActiveOffers === 'function' ? await cartRepository.getActiveOffers() : [];
    const matchingOffer = activeOffers.find(offer => 
        offer.targetIds.some(id => id.toString() === productId.toString())
    );

    if (matchingOffer) {
        const buyQty = matchingOffer.buyQuantity || 1;
        const getQty = matchingOffer.getQuantity || 1;
        // If the user adds enough to trigger the offer, inject the free items automatically
        if (qtyToAdd >= buyQty) {
            const sets = Math.floor(qtyToAdd / buyQty);
            qtyToAdd += (sets * getQty);
        }
    }

    let cart = await cartRepository.getCartDocument(userId);                                   // Retrieve single 'cart' based on 'userId'
    if (!cart) {
        cart = await cartRepository.createEmptyCart(userId);                                   // For create 'new' document based on 'userId' with 'items' array as 'initial value'. 
    }   
    
    const existingItemIndex = cart.items.findIndex(item =>                                     
        item.product.toString() === productId.toString() && 
        item.variantId.toString() === variantId.toString()
    );   
    
    if (existingItemIndex > -1) {                                                              
        const currentQty = cart.items[existingItemIndex].quantity;                     
        let newQty = currentQty + qtyToAdd;                                                  
        
        if (newQty > variant.stock) {
            throw new Error(`Only ${variant.stock} units available in stock.`);
        }
        if (newQty > CART_CONFIG.MAX_QTY_PER_ITEM) {
            throw new Error(`You can purchase a maximum of ${CART_CONFIG.MAX_QTY_PER_ITEM} units per item.`);
        }        
        cart.items[existingItemIndex].quantity = newQty;
        cart.items[existingItemIndex].price = finalPrice;
        cart.items[existingItemIndex].taxRate = product.taxRate || 0;
    } else {
        if (qtyToAdd > variant.stock || qtyToAdd > CART_CONFIG.MAX_QTY_PER_ITEM) {
            throw new Error(`Quantity exceeds available stock or maximum order limits.`);
        }                    
        const displayImage = product.images && product.images.length > 0 ? product.images[0].url : '/images/default-dress.jpg';
        const constructedVariantName = variant.name || `${variant.size} / ${variant.color}`;        
        cart.items.push({
            product: product._id,
            variantId: variant._id,
            name: product.name,
            variantName: constructedVariantName,
            sku: variant.sku,
            price: finalPrice,
            taxRate: product.taxRate || 0,
            image: displayImage,
            quantity: qtyToAdd
        });
    }
    await cartRepository.saveCartDocument(cart);                                               
    await cartRepository.removeProductFromWishlist(userId, productId);                           
    return cart;
};





// export const addItemToCart = async (userId, productId, variantId, requestedQty = 1) => {
//     const product = await cartRepository.getActiveProductById(productId);                     // Retrieve 'single' product(ie it is an array contains 'name', 'variants' like data) based on 'productId' and 'isListed: true'
//     if (!product) throw new Error(CART_MESSAGES.PRODUCT_UNAVAILABLE);                         // Here 'PRODUCT_UNAVAILABLE' stores in 'src/constants/cartConstants.js' file and its value is 'This product is currently unlisted or unavailable.',
//     const variant = product.variants.find(item => item._id.toString() === variantId.toString());
//     if (!variant) throw new Error(CART_MESSAGES.VARIANT_NOT_FOUND);   
//     if (variant.stock === 0) throw new Error(CART_MESSAGES.SOLD_OUT);   
//     let finalPrice = variant.price;
//     if (product.discount > 0) {
//         finalPrice = Math.round(variant.price * (1 - (product.discount / 100)));
//     }   
//     let cart = await cartRepository.getCartDocument(userId);                                   // Retrieve single 'cart' based on 'userId'
//     if (!cart) {
//         cart = await cartRepository.createEmptyCart(userId);                                   // For create 'new' document based on 'userId' with 'items' array as 'initial value'. 
//     }   
//     const existingItemIndex = cart.items.findIndex(item =>                                     // 'findIndex()' is the 'built-in' array method of 'js' and here it iterate through 'cart.items' array and if '2' conditions ie 'item.product.toString()'(ie from 'cart.items' array from 'database) equal to 'productId.toString()'(ie from 'argument') and 'item.variantId.toString() === variantId.toString()' it return 'index' of the 'object'/'product' data from 'items' array and we should convert into string by using 'toString()' because 'two' 'ObjectId' is never identical.
//         item.product.toString() === productId.toString() && 
//         item.variantId.toString() === variantId.toString()
//     );   
//     const qtyToAdd = parseInt(requestedQty) || 1;   
//     if (existingItemIndex > -1) {                                                              // If 'findIndex()' 'not' find the 'item', it automatically return '-1', so here we check is 'not' -1.
//         const currentQty = cart.items[existingItemIndex].quantity;                     // Here we retrieve value of 'existingItemIndex' and it is '0' then we get 'cart.items[0].quantity' ie we retrieving 'quantity' of '0'th index product.   
//         const newQty = currentQty + qtyToAdd;                                                  // 'qtyToAdd'(ie 'requestedQty') get through 'argument'
//         if (newQty > variant.stock) {
//             throw new Error(`Only ${variant.stock} units available in stock.`);
//         }
//         if (newQty > CART_CONFIG.MAX_QTY_PER_ITEM) {
//             throw new Error(`You can purchase a maximum of ${CART_CONFIG.MAX_QTY_PER_ITEM} units per item.`);
//         }        
//         cart.items[existingItemIndex].quantity = newQty;
//         cart.items[existingItemIndex].price = finalPrice;
//         cart.items[existingItemIndex].taxRate = product.taxRate || 0;
//     } else {
//         if (qtyToAdd > variant.stock || qtyToAdd > CART_CONFIG.MAX_QTY_PER_ITEM) {
//             throw new Error(`Quantity exceeds available stock or maximum order limits.`);
//         }                    
//         const displayImage = product.images && product.images.length > 0 ? product.images[0].url : '/images/default-dress.jpg';
//         const constructedVariantName = variant.name || `${variant.size} / ${variant.color}`;        
//         cart.items.push({
//             product: product._id,
//             variantId: variant._id,
//             name: product.name,
//             variantName: constructedVariantName,
//             sku: variant.sku,
//             price: finalPrice,
//             taxRate: product.taxRate || 0,
//             image: displayImage,
//             quantity: qtyToAdd
//         });
//     }
//     await cartRepository.saveCartDocument(cart);                                               // For 'save' 'carDoc' to database
//     await cartRepository.removeProductFromWishlist(userId, productId);                           // For find one 'wishlist' document based on 'userId' and 'pull' or 'delete' 'product' array
//     return cart;
// };



// NEW: For 'Buy Now' to bypass the main database cart
export const getDirectBuyItem = async (productId, variantId, requestedQty = 1) => {
    const product = await cartRepository.getActiveProductById(productId);
    if (!product) throw new Error(CART_MESSAGES.PRODUCT_UNAVAILABLE);                         
    
    const variant = product.variants.find(item => item._id.toString() === variantId.toString());
    if (!variant) throw new Error(CART_MESSAGES.VARIANT_NOT_FOUND);   
    if (variant.stock === 0) throw new Error(CART_MESSAGES.SOLD_OUT);   
    
    let finalPrice = variant.price;
    if (product.discount > 0) {
        finalPrice = Math.round(variant.price * (1 - (product.discount / 100)));
    }   

    let qtyToAdd = parseInt(requestedQty) || 1;   

    // Apply active offers if available
    const activeOffers = typeof cartRepository.getActiveOffers === 'function' ? await cartRepository.getActiveOffers() : [];
    const matchingOffer = activeOffers.find(offer => 
        offer.targetIds.some(id => id.toString() === productId.toString())
    );

    if (matchingOffer) {
        const buyQty = matchingOffer.buyQuantity || 1;
        const getQty = matchingOffer.getQuantity || 1;
        if (qtyToAdd >= buyQty) {
            const sets = Math.floor(qtyToAdd / buyQty);
            qtyToAdd += (sets * getQty);
        }
    }

    if (qtyToAdd > variant.stock || qtyToAdd > CART_CONFIG.MAX_QTY_PER_ITEM) {
        throw new Error(`Quantity exceeds available stock or maximum order limits.`);
    }                    
    
    const displayImage = product.images && product.images.length > 0 ? product.images[0].url : '/images/default-dress.jpg';
    const constructedVariantName = variant.name || `${variant.size} / ${variant.color}`;        
    
    const item = {
        product: product._id,
        variantId: variant._id,
        name: product.name,
        variantName: constructedVariantName,
        sku: variant.sku,
        price: finalPrice,
        taxRate: product.taxRate || 0,
        image: displayImage,
        quantity: qtyToAdd
    };

    // Return a temporary, structured cart object for the session
    return {
        items: [item],
        cartTotal: finalPrice * qtyToAdd
    };
};


// Add Combo Offer to Cart with Pro-rated Pricing
export const addComboOfferToCart = async (userId, offerId, productIds) => {
    // 1. Fetch the active offer document
    const offer = await cartRepository.getOfferById(offerId); // You will need this repo method
    if (!offer || !offer.isManuallyActive || offer.type !== 'Fixed Bundle Price') {
        throw new Error("This combo offer is no longer valid or active.");
    }

    // 2. Fetch all products in the bundle
    const products = await Promise.all(
        productIds.map(id => cartRepository.getActiveProductById(id))
    );

    // 3. Validation: Ensure all products exist and have stock
    let totalOriginalPrice = 0;
    const itemsToAdd = [];

    for (const product of products) {
        if (!product) {
            throw new Error(CART_MESSAGES.PRODUCT_UNAVAILABLE);
        }

        // Assuming default variant [0] since UI didn't specify variant selection for combo
        const variant = product.variants && product.variants.length > 0 ? product.variants[0] : null;
        
        if (!variant) throw new Error(`Variant not found for product ${product.name}`);
        if (variant.stock < 1) throw new Error(`Combo unavailable: ${product.name} is out of stock.`);

        totalOriginalPrice += variant.price;

        const displayImage = product.images && product.images.length > 0 ? product.images[0].url : '/images/default-dress.jpg';
        const constructedVariantName = variant.name || `${variant.size} / ${variant.color}`;

        itemsToAdd.push({
            product: product._id,
            variantId: variant._id,
            name: product.name,
            variantName: constructedVariantName,
            sku: variant.sku,
            originalPrice: variant.price, // Storing this temporarily for math
            taxRate: product.taxRate || 0,
            image: displayImage,
            quantity: 1, // Combos usually add 1 set at a time
            comboOfferId: offer._id // Tagging the item so frontend knows it belongs to a combo
        });
    }

    // 4. Pro-rata calculation for the Fixed Bundle Price
    const comboPrice = offer.discountValue;
    let accumulatedComboPrice = 0;

    itemsToAdd.forEach((item, index) => {
        if (index === itemsToAdd.length - 1) {
            // Last item gets the remainder to avoid decimal rounding issues (e.g., 1999.99 vs 2000)
            item.price = comboPrice - accumulatedComboPrice;
        } else {
            // Distribute price proportionally: (Item Price / Total Original Price) * Combo Price
            const proportion = item.originalPrice / totalOriginalPrice;
            item.price = Math.round(proportion * comboPrice);
            accumulatedComboPrice += item.price;
        }
        delete item.originalPrice; // Cleanup before saving
    });

    // 5. Retrieve or create cart
    let cart = await cartRepository.getCartDocument(userId);
    if (!cart) {
        cart = await cartRepository.createEmptyCart(userId);
    }
    itemsToAdd.forEach(item => {
        cart.items.push(item);
        // Clean up wishlist concurrently
        cartRepository.removeProductFromWishlist(userId, item.product).catch(err => console.error("Wishlist cleanup err:", err));
    });

    await cartRepository.saveCartDocument(cart);
    return cart;
};


// For 'update' item quantity(ie '+' and '-' button)
export const updateItemQuantity = async (userId, itemId, newQty) => {
    const qty = parseInt(newQty);
    if (isNaN(qty) || qty < 1) throw new Error(CART_MESSAGES.QTY_MINIMUM);   
    if (qty > CART_CONFIG.MAX_QTY_PER_ITEM) {
        throw new Error(`Maximum limit is ${CART_CONFIG.MAX_QTY_PER_ITEM} units per item.`);
    }
    const cart = await cartRepository.getCartDocumentPopulated(userId);                         // For retrieve 'one' cart document and 'populated' based on 'product' field
    if (!cart) throw new Error(CART_MESSAGES.CART_NOT_FOUND);
    const item = cart.items.id(itemId);
    if (!item) throw new Error(CART_MESSAGES.ITEM_NOT_FOUND);
    const liveProduct = await cartRepository.getProductById(item.product._id);                // For retrieve 'one' 'product' 'document' based on 'productId'
    if (!liveProduct || !liveProduct.isListed) {                                               // Checks 'product' is 'listed' or 'not'
        throw new Error(CART_MESSAGES.PRODUCT_INACTIVE);
    }
    const liveVariant = liveProduct.variants.find(v => v._id.toString() === item.variantId.toString());  // Here we retrieve 'all' 'variants' from retrieved 'product'(ie 'liveProduct') for checking the 'retrieved' variant and given 'argument' variant are same, and 'stock' is the property in 'variant'.
    if (!liveVariant || liveVariant.stock < qty) {
        throw new Error(`Only ${liveVariant ? liveVariant.stock : 0} units left in stock.`);
    }
    item.quantity = qty;
    await cartRepository.saveCartDocument(cart);                                               // Here 'save' document into 'database'
    return await getUserCartData(userId);                                                      // For 'cross checking' the data in 'cart' and 'recreate' it
};



// export const updateItemQuantity = async (userId, itemId, newQty) => {
//     const qty = parseInt(newQty);
//     if (isNaN(qty) || qty < 1) throw new Error(CART_MESSAGES.QTY_MINIMUM);   
//     if (qty > CART_CONFIG.MAX_QTY_PER_ITEM) {
//         throw new Error(`Maximum limit is ${CART_CONFIG.MAX_QTY_PER_ITEM} units per item.`);
//     }
//     const cart = await cartRepository.getCartDocumentPopulated(userId);                         // For retrieve 'one' cart document and 'populated' based on 'product' field
//     if (!cart) throw new Error(CART_MESSAGES.CART_NOT_FOUND);
//     const item = cart.items.id(itemId);
//     if (!item) throw new Error(CART_MESSAGES.ITEM_NOT_FOUND);
//     const liveProduct = await cartRepository.getProductById(item.product._id);                // For retrieve 'one' 'product' 'document' based on 'productId'
//     if (!liveProduct || !liveProduct.isListed) {                                               // Checks 'product' is 'listed' or 'not'
//         throw new Error(CART_MESSAGES.PRODUCT_INACTIVE);
//     }
//     const liveVariant = liveProduct.variants.find(v => v._id.toString() === item.variantId.toString());  // Here we retrieve 'all' 'variants' from retrieved 'product'(ie 'liveProduct') for checking the 'retrieved' variant and given 'argument' variant are same, and 'stock' is the property in 'variant'.
//     if (!liveVariant || liveVariant.stock < qty) {
//         throw new Error(`Only ${liveVariant ? liveVariant.stock : 0} units left in stock.`);
//     }
//     item.quantity = qty;
//     await cartRepository.saveCartDocument(cart);                                               // Here 'save' document into 'database'
//     return await getUserCartData(userId);                                                      // For 'cross checking' the data in 'cart' and 'recreate' it
// };


// For 'remove' item from cart and 'save' that data.
export const removeItemFromCart = async (userId, itemId) => {
    const cart = await cartRepository.getCartDocument(userId);
    if (!cart) throw new Error(CART_MESSAGES.CART_NOT_FOUND);

    // 1. Find the specific item the user is trying to delete
    const itemToRemove = cart.items.find(item => item._id.toString() === itemId.toString());
    
    // If the item doesn't exist, just return the current cart
    if (!itemToRemove) return await getUserCartData(userId);

    // 2. Check if this item is part of a Combo Offer
    if (itemToRemove.comboOfferId) {
        const comboIdString = itemToRemove.comboOfferId.toString();
        
        // Remove ALL items from the cart that share this exact comboOfferId
        cart.items = cart.items.filter(item => 
            !item.comboOfferId || item.comboOfferId.toString() !== comboIdString
        );
    } else {
        // Normal behavior: remove just the single item based on its unique _id
        cart.items = cart.items.filter(item => item._id.toString() !== itemId.toString());   
    }

    await cartRepository.saveCartDocument(cart);                                         // For 'save' 'cartDoc' to database
    return await getUserCartData(userId);                                                // For 'cross checking' the data in 'cart' and 'recreate' it
};



// export const removeItemFromCart = async (userId, itemId) => {
//     const cart = await cartRepository.getCartDocument(userId);
//     if (!cart) throw new Error(CART_MESSAGES.CART_NOT_FOUND);
//     cart.items = cart.items.filter(item => item._id.toString() !== itemId.toString());   // Here 'item._id' is the 'unique' id that automatically creates when we add a 'new' 'product variant' into the 'cart', and 'itemId' is the unique id,ie when click the 'delete' button in 'ejs' and 'item._id' send from 'ejs' to 'backend' and in 'backend' it 'rename' it into 'name it 'itemId' and here we check both are 'not' equal and if it is 'true', 'filter()' return an 'array' contains all data of that 'product' based 'item._id'. 
//     await cartRepository.saveCartDocument(cart);                                         // For 'save' 'cartDoc' to database
//     return await getUserCartData(userId);                                                // For 'cross checking' the data in 'cart' and 'recreate' it
// };