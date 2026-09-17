

import Order from '../../model/orderModel.js';
import User from '../../model/userModel.js';



export const getSalesAggregate = async (matchQuery) => {
    return await Order.aggregate([
        { $match: matchQuery },                                                                                                       // Filter matching orders only
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }                                                                    // Sum the total amounts of filtered orders
    ]);
};



export const countOrders = async (query) => {
    return await Order.countDocuments(query);
};



export const countUsers = async (query) => {
    return await User.countDocuments(query);
};



export const getChartAggregate = async (matchQuery, groupFormat) => {
    return await Order.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: { $dateToString: { format: groupFormat, date: "$createdAt", timezone: "Asia/Kolkata" } },                        // Format date for grouping
                revenue: { $sum: "$totalAmount" }                                                                                     // Sum revenue for each grouped date
            }
        },
        { $sort: { "_id": 1 } }                                                                                                       // Sort dates in ascending order
    ]);
};



export const getTotalItemsAggregate = async (matchQuery) => {
    return await Order.aggregate([
        { $match: matchQuery },
        { $unwind: "$items" },                                                                                                        // Split array into separate documents
        { $group: { _id: null, totalQuantity: { $sum: "$items.quantity" } } }
    ]);
};



// Retrieve 'top products'
export const getTopProductsAggregate = async (matchQuery) => {
    return await Order.aggregate([
        { $match: matchQuery },
        { $unwind: "$items" },
        {
            $group: {
                _id: "$items.product",
                sold: { $sum: "$items.quantity" },                                                                                    // Calculate total quantity sold
                revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
                lastSold: { $max: "$createdAt" },                                                                                     // Find the latest sale date
                soldPrice: { $first: "$items.price" }
            }
        },
        { $sort: { sold: -1 } },                                                                                                      // Sort by highest sales
        { $limit: 5 },                                                                                                                // Get only the top 5 results
        { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "productDetails" } },
        { $unwind: { path: "$productDetails", preserveNullAndEmptyArrays: true } },
        { $lookup: { from: "categories", localField: "productDetails.subCategory", foreignField: "_id", as: "catDetails" } },
        { $unwind: { path: "$catDetails", preserveNullAndEmptyArrays: true } }
    ]);
};



// Retrieve 'top categories'
export const getTopCategoriesAggregate = async (matchQuery) => {
    return await Order.aggregate([
        { $match: matchQuery },
        { $unwind: "$items" },
        { $lookup: { from: "products", localField: "items.product", foreignField: "_id", as: "productDetails" } },                    // '$lookup' is used from 'joining' data from 'another'(ie here 'products') 'collection'
        { $unwind: "$productDetails" },
        { $lookup: { from: "categories", localField: "productDetails.subCategory", foreignField: "_id", as: "categoryDetails" } },
        { $unwind: { path: "$categoryDetails", preserveNullAndEmptyArrays: true } },
        {
            $group: {
                _id: { $ifNull: ["$categoryDetails.categoryName", "$productDetails.parentCategory"] },                                // Use fallback category if primary is empty
                sold: { $sum: "$items.quantity" }
            }
        },
        { $sort: { sold: -1 } },
        { $limit: 4 }
    ]);
};



// Retrieve 'top brands'
export const getTopBrandsAggregate = async (matchQuery) => {
    return await Order.aggregate([
        { $match: matchQuery },
        { $unwind: "$items" },
        { $lookup: { from: "products", localField: "items.product", foreignField: "_id", as: "productDetails" } },
        { $unwind: "$productDetails" },
        {
            $group: {
                _id: { $ifNull: ["$productDetails.brand", "Generic"] },                                                               // Use 'Generic' if no brand is found
                sold: { $sum: "$items.quantity" }
            }
        },
        { $sort: { sold: -1 } },
        { $limit: 4 }
    ]);
};



export const findAdminByEmail = async (email, role) => {
    return await User.findOne({ email: email, role: role });
};