// Change imports to use your existing services and correct repository paths
import * as cartService from './cartService.js';
import * as addressRepository from '../../repository/user/userAddressRepository.js'; 
import * as orderRepository from '../../repository/user/orderRepository.js'; 
import Coupon  from '../../model/couponModel.js';

export const getCheckoutPageData = async (userId) => {
    const cart = await cartService.getUserCartData(userId);
    const addresses = await addressRepository.findAddressesByUserId(userId);
    if (!cart || !cart.items || cart.items.length === 0) {
        throw new Error("CART_EMPTY");
    }
    if (cart.hasInvalidItems) {
        throw new Error("CART_INVALID_ITEMS");
    }
    let subTotal = cart.cartTotal;
    let shipping = subTotal > 1000 ? 0 : 150; 
    let discount = 0; 
    let grandTotal = subTotal + shipping - discount;
    const currentDate = new Date();
    const availableCoupons = await Coupon.find({
        isActive: true,
        validFrom: { $lte: currentDate },
        validTill: { $gte: currentDate }
    }).lean();
    return { 
        cart, 
        addresses, 
        totals: { subTotal, shipping, discount, grandTotal },
        availableCoupons 
    };
};



export const processOrder = async (userId, checkoutData) => {
    const { selectedAddress, paymentMethod } = checkoutData;
    const cart = await cartService.getUserCartData(userId);
    
    if (!cart || cart.items.length === 0) throw new Error("CART_EMPTY");
    if (cart.hasInvalidItems) throw new Error("CART_INVALID_ITEMS");
    const orderItems = cart.items.map(item => ({
        product: item.product._id, 
        variant: item.variantId,
        quantity: item.quantity,
        price: item.livePrice 
    }));
    const newOrder = {
        user: userId,
        orderItems,
        shippingAddress: selectedAddress,
        paymentMethod,
        paymentStatus: paymentMethod === 'cod' ? 'Pending' : 'Completed', 
        totalAmount: cart.cartTotal, 
        orderStatus: 'Processing'
    };
    const savedOrder = await orderRepository.createNewOrder(newOrder);
    for (let item of cart.items) {
        await orderRepository.updateProductStock(item.product._id, item.variantId, item.quantity);
    }
    await orderRepository.clearUserCart(userId);
    return savedOrder;
};