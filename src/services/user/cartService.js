import Cart from '../../model/cartModel.js';
import Product from '../../model/productModel.js';
import Wishlist from '../../model/wishlistModel.js'


const MAX_QTY_PER_ITEM = 10; 

// For display cart
export const getUserCart = async (userId) => {
    let cart = await Cart.findOne({ user: userId }).populate({
        path: 'items.product',
        select: 'name brand isListed totalStock variants discount'
    }).lean();

    if (!cart) {
        return { items: [], cartTotal: 0, hasInvalidItems: false };
    }
    let calculatedTotal = 0;
    let hasInvalidItems = false;
    const reconciledItems = [];
    for (const item of cart.items) {
        const liveProduct = item.product;
        const isUnlisted = !liveProduct || !liveProduct.isListed;   
        let liveStock = 0;
        let livePrice = item.price;
        if (liveProduct && liveProduct.variants) {
            const liveVariant = liveProduct.variants.find(v => v._id.toString() === item.variantId.toString());
            if (liveVariant) {
                liveStock = liveVariant.stock;
                livePrice = liveVariant.price;
                // Apply live discount math if active
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

// For add item to cart
export const addItemToCart = async (userId, productId, variantId, requestedQty = 1) => {
    const product = await Product.findOne({ _id: productId, isListed: true });
    if (!product) {
        throw new Error("This product is currently unlisted or unavailable.");
    }
    const variant = product.variants.find(v => v._id.toString() === variantId.toString());
    if (!variant) {
        throw new Error("Selected product variant could not be found.");
    }
    if (variant.stock === 0) {
        throw new Error("This item is currently sold out.");
    }
    let finalPrice = variant.price;
    if (product.discount > 0) {
        finalPrice = Math.round(variant.price * (1 - (product.discount / 100)));
    }
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
        cart = new Cart({ user: userId, items: [] });
    }
    const existingItemIndex = cart.items.findIndex(item => 
        item.product.toString() === productId.toString() && 
        item.variantId.toString() === variantId.toString()
    );
    const qtyToAdd = parseInt(requestedQty) || 1;
    if (existingItemIndex > -1) {
        const currentQty = cart.items[existingItemIndex].quantity;
        const newQty = currentQty + qtyToAdd;
        if (newQty > variant.stock) {
            throw new Error(`Only ${variant.stock} units available in stock.`);
        }
        if (newQty > MAX_QTY_PER_ITEM) {
            throw new Error(`You can purchase a maximum of ${MAX_QTY_PER_ITEM} units per item.`);
        }
        cart.items[existingItemIndex].quantity = newQty;
        cart.items[existingItemIndex].price = finalPrice;
    } else {
        if (qtyToAdd > variant.stock || qtyToAdd > MAX_QTY_PER_ITEM) {
            throw new Error(`Quantity exceeds available stock or maximum order limits.`);
        }
        const displayImage = product.images && product.images.length > 0 ? product.images[0].url : '/images/default-dress.jpg';
        cart.items.push({
            product: product._id,
            variantId: variant._id,
            name: product.name,
            variantName: variant.name,
            sku: variant.sku,
            price: finalPrice,
            image: displayImage,
            quantity: qtyToAdd
        });
    }
    await cart.save();

    if (Wishlist) {
        try {
            await Wishlist.findOneAndUpdate(
                { user: userId },
                { $pull: { products: productId } }
            );
        } catch (wishlistError) {
            console.error("Non-fatal error pulling item from wishlist:", wishlistError);
        }
    }

    return cart;
};

// For update quantity 
export const updateItemQuantity = async (userId, itemId, newQty) => {
    const qty = parseInt(newQty);
    if (isNaN(qty) || qty < 1) {
        throw new Error("Quantity must be at least 1.");
    }
    if (qty > MAX_QTY_PER_ITEM) {
        throw new Error(`Maximum limit is ${MAX_QTY_PER_ITEM} units per item.`);
    }
    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    if (!cart) throw new Error("Shopping cart not found.");
    const item = cart.items.id(itemId);
    if (!item) throw new Error("Item not found in cart.");
    const liveProduct = await Product.findById(item.product._id);
    if (!liveProduct || !liveProduct.isListed) {
        throw new Error("This product is no longer active in our catalog.");
    }
    const liveVariant = liveProduct.variants.find(v => v._id.toString() === item.variantId.toString());
    if (!liveVariant || liveVariant.stock < qty) {
        throw new Error(`Only ${liveVariant ? liveVariant.stock : 0} units left in stock.`);
    }
    item.quantity = qty;
    await cart.save();

    return await getUserCart(userId); // Return refreshed cart calculations
};


// For remove item from cart
export const removeItemFromCart = async (userId, itemId) => {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) throw new Error("Cart not found.");

    cart.items = cart.items.filter(item => item._id.toString() !== itemId.toString());
    await cart.save();

    return await getUserCart(userId);
};