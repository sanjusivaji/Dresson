import * as cartRepository from '../../repository/user/cartRepository.js';
import { CART_CONFIG, CART_MESSAGES } from '../../constants/cartConstants.js';
import crypto from 'crypto'; 


// Looks through the cart to make sure all items are still available, in stock, and priced correctly
export const getUserCartData = async (userId) => {
    const cart = await cartRepository.getCartPopulatedForDisplay(userId);
    if (!cart) {
        return { items: [], cartTotal: 0, hasInvalidItems: false };
    }
    const activeOffers = typeof cartRepository.getActiveOffers === 'function' 
        ? await cartRepository.getActiveOffers() 
        : [];
    let calculatedTotal = 0;
    let hasInvalidItems = false;
    const reconciledItems = [];
    const now = new Date();
    for (const item of cart.items) {
        const liveProduct = item.product;
        const isUnlisted = !liveProduct || !liveProduct.isListed;   
        const isFreeGift = !!item.isFreeGift; 
        let liveStock = 0; 
        let savedPrice = item.price; 
        let retailPrice = item.price; 
        let originalVariantPrice = item.price;
        if (liveProduct && liveProduct.variants) {
            const liveVariant = liveProduct.variants.find(v => v._id.toString() === item.variantId.toString());
            if (liveVariant) {
                liveStock = liveVariant.stock;
                originalVariantPrice = liveVariant.price;
                retailPrice = liveVariant.price;
                let directDiscountPrice = originalVariantPrice;
                if (typeof liveProduct.discount === 'number' && liveProduct.discount > 0) {
                    directDiscountPrice = Math.round(originalVariantPrice * (1 - (liveProduct.discount / 100)));
                }
                if (activeOffers.length > 0) {
                    const prodIdStr = liveProduct._id.toString();
                    const catIdStr = liveProduct.category ? (liveProduct.category._id || liveProduct.category).toString() : '';
                    const subCatIdStr = liveProduct.subCategory ? (liveProduct.subCategory._id || liveProduct.subCategory).toString() : '';
                    const matchingOffers = activeOffers.filter(offer => {
                        if (!offer.isManuallyActive) return false;
                        if (now < new Date(offer.startDate) || now > new Date(offer.endDate)) return false;
                        if (offer.targetType === 'Specific Product') {
                            return offer.targetIds && offer.targetIds.some(id => id.toString() === prodIdStr);
                        } else if (offer.targetType === 'Entire Category') {
                            return offer.targetIds && offer.targetIds.some(id => {
                                const tId = id.toString();
                                return tId === catIdStr || tId === subCatIdStr;
                            });
                        }
                        return false;
                    });
                    let bestOffer = null;
                    let maxScore = -1;
                    matchingOffers.forEach(offer => {
                        let score = 0;
                        if (offer.type === 'Fixed Bundle Price') {
                            score = 50000; 
                        } else if (offer.type === 'Buy X, Get Y' || offer.type === 'Buy X Get Y') {
                            score = 10000; 
                        } else if (offer.type === 'Percentage') {
                            score = originalVariantPrice * (offer.discountValue / 100); 
                        } else if (offer.type === 'Flat Discount') {
                            score = offer.discountValue;
                        } else if (offer.type === 'Free Shipping' || offer.type === 'Free shipping') {
                            score = 100; 
                        }
                        if (score > maxScore) {
                            maxScore = score;
                            bestOffer = offer;
                        }
                    });
                    if (bestOffer && (bestOffer.type === 'Buy X, Get Y' || bestOffer.type === 'Buy X Get Y' || bestOffer.type === 'Free Shipping' || bestOffer.type === 'Free shipping')) {
                        retailPrice = originalVariantPrice; 
                    } else if (bestOffer && bestOffer.type === 'Fixed Bundle Price') {
                        retailPrice = bestOffer.discountValue; 
                    } else if (bestOffer) {
                        retailPrice = Math.min(directDiscountPrice, originalVariantPrice - maxScore);
                    } else {
                        retailPrice = directDiscountPrice;
                    }
                } else {
                    retailPrice = directDiscountPrice;
                }
            }
        }
        if (isFreeGift) {
            retailPrice = 0;
        }
        const isComboItem = !!item.comboOfferId || (savedPrice < retailPrice && savedPrice > 0 && !isFreeGift);
        let currentLivePrice = isComboItem ? savedPrice : retailPrice;
        let adjustedPrice = currentLivePrice;
        let freeQty = 0;      
        if (!isComboItem && !isFreeGift && !item.bogoGroupId && liveProduct) {
            const prodIdStr = liveProduct._id.toString();
            const matchingBogoOffer = activeOffers.find(offer => 
                offer.type === 'Buy X, Get Y' && 
                offer.isManuallyActive &&
                now >= new Date(offer.startDate) &&
                now <= new Date(offer.endDate) &&
                offer.targetIds &&
                offer.targetIds.some(id => id.toString() === prodIdStr)
            );
            if (matchingBogoOffer) {
                const buyQty = matchingBogoOffer.buyQuantity || 1;
                const getQty = matchingBogoOffer.getQuantity || 1;
                if (item.quantity >= (buyQty + getQty)) {
                    const sets = Math.floor(item.quantity / (buyQty + getQty));
                    freeQty = sets * getQty;
                    const paidQuantity = item.quantity - freeQty;
                    adjustedPrice = Math.round((currentLivePrice * paidQuantity) / item.quantity);
                }
            }
        }
        const isOutOfStock = liveStock === 0;
        const isExceedingStock = item.quantity > liveStock;
        const effectivePrice = isComboItem ? savedPrice : adjustedPrice;
        if (isUnlisted || isOutOfStock || isExceedingStock) {
            hasInvalidItems = true;
        } else {
            calculatedTotal += (effectivePrice * (item.quantity - freeQty)); 
        }
        const itemData = item.toObject ? item.toObject() : item;
        reconciledItems.push({
            ...itemData,
            originalPrice: originalVariantPrice,
            livePrice: retailPrice,
            effectivePrice,
            hasDiscount: originalVariantPrice > retailPrice,
            discountPerUnit: originalVariantPrice - retailPrice,
            isComboItem,            
            adjustedPrice,          
            freeQuantity: freeQty,  
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


// Adds a new product to the cart, calculates its exact price with offers, and removes it from the wishlist
export const addItemToCart = async (userId, productId, variantId, requestedQty = 1) => {
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
    let cart = await cartRepository.getCartDocument(userId);                                   
    if (!cart) cart = await cartRepository.createEmptyCart(userId);                                   
    const activeOffers = typeof cartRepository.getActiveOffers === 'function' ? await cartRepository.getActiveOffers() : [];
    const bogoOffer = activeOffers.find(offer => 
        offer.type === 'Buy X, Get Y' && 
        offer.targetIds.some(id => id.toString() === productId.toString())
    );
    if (bogoOffer && bogoOffer.freeTargetIds && bogoOffer.freeTargetIds.length > 0 && qtyToAdd >= (bogoOffer.buyQuantity || 1)) {
        const freeProductId = bogoOffer.freeTargetIds[0];
        const freeProduct = await cartRepository.getActiveProductById(freeProductId);
        if (freeProduct && freeProduct.variants && freeProduct.variants.length > 0) {
            const freeVariant = freeProduct.variants.find(v => v.stock >= (bogoOffer.getQuantity || 1));
            if (freeVariant) {
                const uniqueBogoGroupId = `BOGO-${crypto.randomBytes(4).toString('hex')}`;
                const mainImage = product.images && product.images.length > 0 ? product.images[0].url : '/images/default-dress.jpg';
                cart.items.push({
                    product: product._id,
                    variantId: variant._id,
                    name: product.name,
                    variantName: variant.name || `${variant.size} / ${variant.color}`,
                    sku: variant.sku,
                    price: finalPrice,
                    taxRate: product.taxRate || 0,
                    image: mainImage,
                    quantity: qtyToAdd,
                    bogoGroupId: uniqueBogoGroupId,
                    isFreeGift: false
                });
                const freeImage = freeProduct.images && freeProduct.images.length > 0 ? freeProduct.images[0].url : '/images/default-dress.jpg';
                cart.items.push({
                    product: freeProduct._id,
                    variantId: freeVariant._id,
                    name: freeProduct.name,
                    variantName: freeVariant.name || `${freeVariant.size} / ${freeVariant.color}`,
                    sku: freeVariant.sku,
                    price: 0,
                    taxRate: 0,
                    image: freeImage,
                    quantity: bogoOffer.getQuantity || 1,
                    bogoGroupId: uniqueBogoGroupId,
                    isFreeGift: true
                });
                await cartRepository.saveCartDocument(cart);                                               
                await cartRepository.removeProductFromWishlist(userId, productId);                           
                return cart;
            }
        }
    }
    const existingItemIndex = cart.items.findIndex(item =>                                     
        item.product.toString() === productId.toString() && 
        item.variantId.toString() === variantId.toString() &&
        !item.isFreeGift
    );       
    if (existingItemIndex > -1) {                                                              
        let newQty = cart.items[existingItemIndex].quantity + qtyToAdd;                                                  
        if (newQty > variant.stock) throw new Error(`Only ${variant.stock} units available.`);
        if (newQty > CART_CONFIG.MAX_QTY_PER_ITEM) throw new Error(`Max limit is ${CART_CONFIG.MAX_QTY_PER_ITEM}.`);
        cart.items[existingItemIndex].quantity = newQty;
        cart.items[existingItemIndex].price = finalPrice;
    } else {
        if (qtyToAdd > variant.stock) throw new Error(`Quantity exceeds stock.`);
        const displayImage = product.images && product.images.length > 0 ? product.images[0].url : '/images/default-dress.jpg';
        cart.items.push({
            product: product._id,
            variantId: variant._id,
            name: product.name,
            variantName: variant.name || `${variant.size} / ${variant.color}`,
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


// Sets up a temporary cart that bypasses the database when a user clicks 'Buy Now'
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
    return {
        items: [item],
        cartTotal: finalPrice * qtyToAdd
    };
};


// Splits the price of a Fixed Bundle Offer across all products evenly and adds them to the cart
export const addComboOfferToCart = async (userId, offerId, productIds) => {
    const offer = await cartRepository.getOfferById(offerId); 
    if (!offer || !offer.isManuallyActive || offer.type !== 'Fixed Bundle Price') {
        throw new Error("This combo offer is no longer valid or active.");
    }
    const products = await Promise.all(
        productIds.map(id => cartRepository.getActiveProductById(id))
    );
    let totalOriginalPrice = 0;
    const itemsToAdd = [];
    for (const product of products) {
        if (!product) {
            throw new Error(CART_MESSAGES.PRODUCT_UNAVAILABLE);
        }
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
            originalPrice: variant.price, 
            taxRate: product.taxRate || 0,
            image: displayImage,
            quantity: 1,
            comboOfferId: offer._id
        });
    }
    const comboPrice = offer.discountValue;
    let accumulatedComboPrice = 0;
    itemsToAdd.forEach((item, index) => {
        if (index === itemsToAdd.length - 1) {
            item.price = comboPrice - accumulatedComboPrice;
        } else {
            const proportion = item.originalPrice / totalOriginalPrice;
            item.price = Math.round(proportion * comboPrice);
            accumulatedComboPrice += item.price;
        }
        delete item.originalPrice; 
    });
    let cart = await cartRepository.getCartDocument(userId);
    if (!cart) {
        cart = await cartRepository.createEmptyCart(userId);
    }
    itemsToAdd.forEach(item => {
        cart.items.push(item);
        cartRepository.removeProductFromWishlist(userId, item.product).catch(err => console.error("Wishlist cleanup err:", err));
    });
    await cartRepository.saveCartDocument(cart);
    return cart;
};


// Increases or decreases the item amount when the plus or minus buttons are clicked
export const updateItemQuantity = async (userId, itemId, newQty) => {
    const qty = parseInt(newQty);
    if (isNaN(qty) || qty < 1) throw new Error(CART_MESSAGES.QTY_MINIMUM);   
    if (qty > CART_CONFIG.MAX_QTY_PER_ITEM) {
        throw new Error(`Maximum limit is ${CART_CONFIG.MAX_QTY_PER_ITEM} units per item.`);
    }
    const cart = await cartRepository.getCartDocumentPopulated(userId);
    if (!cart) throw new Error(CART_MESSAGES.CART_NOT_FOUND);
    const item = cart.items.id(itemId);
    if (!item) throw new Error(CART_MESSAGES.ITEM_NOT_FOUND);
    if (item.isFreeGift) {
        throw new Error("Quantities of free promotional gifts cannot be modified directly.");
    }
    const liveProduct = await cartRepository.getProductById(item.product._id);
    if (!liveProduct || !liveProduct.isListed) {
        throw new Error(CART_MESSAGES.PRODUCT_INACTIVE);
    }
    const liveVariant = liveProduct.variants.find(v => v._id.toString() === item.variantId.toString());
    if (!liveVariant || liveVariant.stock < qty) {
        throw new Error(`Only ${liveVariant ? liveVariant.stock : 0} units left in stock.`);
    }
    item.quantity = qty;
    await cartRepository.saveCartDocument(cart);
    return await getUserCartData(userId);
};


// Deletes an item from the cart, making sure to remove any linked free gifts or combo bundles
export const removeItemFromCart = async (userId, itemId) => {
    const cart = await cartRepository.getCartDocument(userId);
    if (!cart) throw new Error(CART_MESSAGES.CART_NOT_FOUND);
    const itemToRemove = cart.items.find(item => item._id.toString() === itemId.toString());
    if (!itemToRemove) return await getUserCartData(userId);
    if (itemToRemove.comboOfferId) {
        if (itemToRemove.comboGroupId) {
            const groupIdString = itemToRemove.comboGroupId.toString();
            cart.items = cart.items.filter(item => 
                !item.comboGroupId || item.comboGroupId.toString() !== groupIdString
            );
        } else {
            const comboIdString = itemToRemove.comboOfferId.toString();
            const clickedProductId = itemToRemove.product.toString();
            const removedProducts = new Set();
            removedProducts.add(clickedProductId);
            cart.items = cart.items.filter(item => {
                if (item._id.toString() === itemId.toString()) {
                    return false; 
                }
                if (item.comboOfferId && item.comboOfferId.toString() === comboIdString) {
                    const prodIdStr = item.product.toString();
                    if (!removedProducts.has(prodIdStr)) {
                        removedProducts.add(prodIdStr);
                        return false; 
                    }
                }
                return true;
            });
        }
    } else if (itemToRemove.bogoGroupId) {
        const bogoIdString = itemToRemove.bogoGroupId.toString();
        cart.items = cart.items.filter(item => 
            !item.bogoGroupId || item.bogoGroupId.toString() !== bogoIdString
        );
    } else {
        cart.items = cart.items.filter(item => item._id.toString() !== itemId.toString());   
    }
    await cartRepository.saveCartDocument(cart);                                         
    return await getUserCartData(userId);                                                
};