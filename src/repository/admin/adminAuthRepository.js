import Order from '../../model/orderModel.js'; 
import User from '../../model/userModel.js';


export const getSalesAggregate = async (matchQuery) => {
    return await Order.aggregate([
        { $match: matchQuery },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
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
                _id: { $dateToString: { format: groupFormat, date: "$createdAt", timezone: "Asia/Kolkata" } },
                revenue: { $sum: "$totalAmount" }
            }
        },
        { $sort: { "_id": 1 } } 
    ]);
};

export const getTotalItemsAggregate = async (matchQuery) => {
    return await Order.aggregate([
        { $match: matchQuery },
        { $unwind: "$items" },
        { $group: { _id: null, totalQuantity: { $sum: "$items.quantity" } } }
    ]);
};

export const getTopProductsAggregate = async (matchQuery) => {
    return await Order.aggregate([
        { $match: matchQuery },
        { $unwind: "$items" },
        {
            $group: {
                _id: "$items.product",
                sold: { $sum: "$items.quantity" },
                revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
                lastSold: { $max: "$createdAt" },
                soldPrice: { $first: "$items.price" }
            }
        },
        { $sort: { sold: -1 } },
        { $limit: 5 },
        { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "productDetails" } },
        { $unwind: { path: "$productDetails", preserveNullAndEmptyArrays: true } },
        { $lookup: { from: "categories", localField: "productDetails.subCategory", foreignField: "_id", as: "catDetails" } },
        { $unwind: { path: "$catDetails", preserveNullAndEmptyArrays: true } }
    ]);
};

export const getTopCategoriesAggregate = async (matchQuery) => {
    return await Order.aggregate([
        { $match: matchQuery },
        { $unwind: "$items" },
        { $lookup: { from: "products", localField: "items.product", foreignField: "_id", as: "productDetails" } },
        { $unwind: "$productDetails" },
        { $lookup: { from: "categories", localField: "productDetails.subCategory", foreignField: "_id", as: "categoryDetails" } },
        { $unwind: { path: "$categoryDetails", preserveNullAndEmptyArrays: true } },
        {
            $group: {
                _id: { $ifNull: ["$categoryDetails.categoryName", "$productDetails.parentCategory"] }, 
                sold: { $sum: "$items.quantity" }
            }
        },
        { $sort: { sold: -1 } },
        { $limit: 4 }
    ]);
};

export const getTopBrandsAggregate = async (matchQuery) => {
    return await Order.aggregate([
        { $match: matchQuery },
        { $unwind: "$items" },
        { $lookup: { from: "products", localField: "items.product", foreignField: "_id", as: "productDetails" } },
        { $unwind: "$productDetails" },
        {
            $group: {
                _id: { $ifNull: ["$productDetails.brand", "Generic"] }, 
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