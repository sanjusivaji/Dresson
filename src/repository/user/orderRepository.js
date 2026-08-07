import Order from '../../model/orderModel.js';
import Cart from '../../model/cartModel.js';
import Product from '../../model/productModel.js';

// Creates the final order document in the database
export const createNewOrder = async (orderData) => {
    const order = new Order(orderData);
    return await order.save();
};

// Empties the cart after a successful checkout
export const clearUserCart = async (userId) => {
    return await Cart.findOneAndUpdate(
        { user: userId }, 
        { items: [], totalAmount: 0 }, 
        { returnDocument: 'after' }
    );
};

// Deducts the purchased quantity from the product's inventory
export const updateProductStock = async (productId, variantId, quantity) => {
    return await Product.updateOne(
        { _id: productId, "variants._id": variantId },
        { 
            $inc: { 
                "variants.$.stock": -quantity, 
                totalStock: -quantity 
            } 
        }
    );
};