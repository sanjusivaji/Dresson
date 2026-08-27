// import Order from '../../model/orderModel.js';
// import Cart from '../../model/cartModel.js';
// import Product from '../../model/productModel.js';

// // Creates the final order document in the database
// export const createNewOrder = async (orderData) => {
//     const order = new Order(orderData);
//     return await order.save();
// };

// export const findOrderById = async (orderId) => {
//     try {
//         const order = await Order.findById(orderId);
//         return order;
//     } catch (error) {
//         console.error("Error in findOrderById repository:", error);
//         throw error;
//     }
// };


// // For 'empties' the cart after a successful checkout
// export const clearUserCart = async (userId) => {
//     return await Cart.findOneAndUpdate(
//         { user: userId }, 
//         { items: [], totalAmount: 0 }, 
//         { returnDocument: 'after' }
//     );
// };

// // Deducts the purchased quantity from the product's inventory
// export const updateProductStock = async (productId, variantSku, quantity) => {
//     try {
//         // 1. Find the product by its ObjectId, AND match the specific variant inside the array using the string SKU
//         const result = await Product.updateOne(
//             { 
//                 _id: productId, 
//                 "variants.sku": variantSku // Matches the string exactly (Update this path if your schema names it differently!)
//             },
//             { 
//                 // 2. The '$' operator updates the exact variant that matched the SKU above
//                 $inc: { "variants.$.stock": -quantity } 
//             }
//         );

//         if (result.modifiedCount === 0) {
//             console.warn(`Warning: Stock not updated for Product ${productId} / SKU ${variantSku}. It may not exist.`);
//         }

//         return result;
//     } catch (error) {
//         console.error("Error updating product stock in repository:", error);
//         throw error; // Let the service catch the crash
//     }
// };