import * as cartRepository from '../../repository/user/cartRepository.js';
import { CART_CONFIG, CART_MESSAGES } from '../../constants/cartConstants.js';

// For 'cross checking' the data in 'cart' and 'recreate' it
export const getUserCartData = async (userId) => {
    const cart = await cartRepository.getCartPopulatedForDisplay(userId);                                     // In 'cart' contains 'cartId', 'userId', 'items' array(ie it contains all details about 'product' in object, 'product name', 'id', 'quantity','image', 'price', 'sku' etc).
    if (!cart) {
        return { items: [], cartTotal: 0, hasInvalidItems: false };
    }
    let calculatedTotal = 0;
    let hasInvalidItems = false;
    const reconciledItems = [];                                                                               // Array declared 'outside' forloop.
    for (const item of cart.items) {
        const liveProduct = item.product;                                                                     // Here we iterate 'cart.items'(ie 'items' is the array inside 'cart' object)and inside 'items' array contains 'product' named object and inside 'product' have 'name',brand', 'variants'(it contains 'size', 'color', 'sku' etc) array, 'total stock' etc.
        const isUnlisted = !liveProduct || !liveProduct.isListed;   
        let liveStock = 0;
        let livePrice = item.price;
        if (liveProduct && liveProduct.variants) {                                                           // Here we check is 'product'(ie 'liveProduct')and 'product' has 'variant'(ie 'liveProduct.variants')
            const liveVariant = liveProduct.variants.find(v => v._id.toString() === item.variantId.toString());
            if (liveVariant) {
                liveStock = liveVariant.stock;
                livePrice = liveVariant.price;
                if (liveProduct.discount > 0) {
                    livePrice = Math.round(liveVariant.price * (1 - (liveProduct.discount / 100)));
                }
            }
        }
        const isOutOfStock = liveStock === 0;
        const isExceedingStock = item.quantity > liveStock;
        if (isUnlisted || isOutOfStock || isExceedingStock) {
            hasInvalidItems = true;
        } else {
            calculatedTotal += (livePrice * item.quantity);
        }
        reconciledItems.push({
            ...item,
            livePrice,
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

// For get single 'cart' document,create a 'empty' cart document, add 'new' quantity , calculate 'final price' and 'save' this into 'data base' and 'remove' product from 'wishlist'. 
export const addItemToCart = async (userId, productId, variantId, requestedQty = 1) => {
    const product = await cartRepository.getActiveProductById(productId);                    // Retrieve 'single' product(ie it is an array contains 'name', 'variants' like data) based on 'productId' and 'isListed: true'
    if (!product) throw new Error(CART_MESSAGES.PRODUCT_UNAVAILABLE);                        // Here 'PRODUCT_UNAVAILABLE' stores in 'src/constants/cartConstants.js' file and its value is 'This product is currently unlisted or unavailable.',
    const variant = product.variants.find(item => item._id.toString() === variantId.toString());
    if (!variant) throw new Error(CART_MESSAGES.VARIANT_NOT_FOUND);    
    if (variant.stock === 0) throw new Error(CART_MESSAGES.SOLD_OUT);    
    let finalPrice = variant.price;
    if (product.discount > 0) {
        finalPrice = Math.round(variant.price * (1 - (product.discount / 100)));
    }    
    let cart = await cartRepository.getCartDocument(userId);                               // Retrieve single 'cart' based on 'userId'
    if (!cart) {
        cart = await cartRepository.createEmptyCart(userId);                               // For create 'new' document based on 'userId' with 'items' array as 'initial value'. 
    }    
    const existingItemIndex = cart.items.findIndex(item =>                                 // 'findIndex()' is the 'built-in' array method of 'js' and here it iterate through 'cart.items' array and if '2' conditions ie 'item.product.toString()'(ie from 'cart.items' array from 'database) equal to 'productId.toString()'(ie from 'argument') and 'item.variantId.toString() === variantId.toString()' it return 'index' of the 'object'/'product' data from 'items' array and we should convert into string by using 'toString()' because 'two' 'ObjectId' is never identical.
        item.product.toString() === productId.toString() && 
        item.variantId.toString() === variantId.toString()
    );    
    const qtyToAdd = parseInt(requestedQty) || 1;    
    if (existingItemIndex > -1) {                                                         // If 'findIndex()' 'not' find the 'item', it automatically return '-1', so here we check is 'not' -1.
        const currentQty = cart.items[existingItemIndex].quantity;                        // Here we retrieve value of 'existingItemIndex' and it is '0' then we get 'cart.items[0].quantity' ie we retrieving 'quantity' of '0'th index product.    
        const newQty = currentQty + qtyToAdd;                                             // 'qtyToAdd'(ie 'requestedQty') get through 'argument'
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
    await cartRepository.saveCartDocument(cart);                                                   // For 'save' 'carDoc' to database
    await cartRepository.removeProductFromWishlist(userId, productId);                             // For find one 'wishlist' document based on 'userId' and 'pull' or 'delete' 'product' array
    return cart;
};


// For 'update' item quantity(ie '+' and '-' button)
export const updateItemQuantity = async (userId, itemId, newQty) => {
    const qty = parseInt(newQty);
    if (isNaN(qty) || qty < 1) throw new Error(CART_MESSAGES.QTY_MINIMUM);    
    if (qty > CART_CONFIG.MAX_QTY_PER_ITEM) {
        throw new Error(`Maximum limit is ${CART_CONFIG.MAX_QTY_PER_ITEM} units per item.`);
    }
    const cart = await cartRepository.getCartDocumentPopulated(userId);                       // For retrieve 'one' cart document and 'populated' based on 'product' field
    if (!cart) throw new Error(CART_MESSAGES.CART_NOT_FOUND);
    const item = cart.items.id(itemId);
    if (!item) throw new Error(CART_MESSAGES.ITEM_NOT_FOUND);
    const liveProduct = await cartRepository.getProductById(item.product._id);               // For retrieve 'one' 'product' 'document' based on 'productId'
    if (!liveProduct || !liveProduct.isListed) {                                             // Checks 'product' is 'listed' or 'not'
        throw new Error(CART_MESSAGES.PRODUCT_INACTIVE);
    }
    const liveVariant = liveProduct.variants.find(v => v._id.toString() === item.variantId.toString());  // Here we retrieve 'all' 'variants' from retrieved 'product'(ie 'liveProduct') for checking the 'retrieved' variant and given 'argument' variant are same, and 'stock' is the property in 'variant'.
    if (!liveVariant || liveVariant.stock < qty) {
        throw new Error(`Only ${liveVariant ? liveVariant.stock : 0} units left in stock.`);
    }
    item.quantity = qty;
    await cartRepository.saveCartDocument(cart);                                            // Here 'save' document into 'database'
    return await getUserCartData(userId);                                                   // For 'cross checking' the data in 'cart' and 'recreate' it
};



// For 'remove' item from cart and 'save' that data.
export const removeItemFromCart = async (userId, itemId) => {
    const cart = await cartRepository.getCartDocument(userId);
    if (!cart) throw new Error(CART_MESSAGES.CART_NOT_FOUND);
    cart.items = cart.items.filter(item => item._id.toString() !== itemId.toString());   // Here 'item._id' is the 'unique' id that automatically creates when we add a 'new' 'product variant' into the 'cart', and 'itemId' is the unique id,ie when click the 'delete' button in 'ejs' and 'item._id' send from 'ejs' to 'backend' and in 'backend' it 'rename' it into 'name it 'itemId' and here we check both are 'not' equal and if it is 'true', 'filter()' return an 'array' contains all data of that 'product' based 'item._id'. 
    await cartRepository.saveCartDocument(cart);                                         // For 'save' 'cartDoc' to database
    return await getUserCartData(userId);                                                // For 'cross checking' the data in 'cart' and 'recreate' it
};