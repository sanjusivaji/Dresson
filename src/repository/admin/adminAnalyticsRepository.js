import Order from '../../model/orderModel.js';
import paginate from '../../utilities/paginationHelper.js';


// It retrieve 'totalSales','totalDiscounts', 'totalProductsSold', 'totalOrders' like values for 'dynamic' display based on 'matchQuery'(ie 'date ranges' and 'status') 
export const getAggregateMetrics = async (matchQuery) => {
    const result = await Order.aggregate([
        { $match: matchQuery },
        { $unwind: { path: "$items", preserveNullAndEmptyArrays: true } },
        {
            $group: {
                _id: "$_id",
                orderTotalAmount: { $first: "$totalAmount" },
                orderDiscountAmount: { $first: "$discountAmount" },
                itemsInOrder: { $sum: { $ifNull: ["$items.quantity", 0] } }
            }
        },
        {
            $group: {
                _id: null,
                totalSales: { $sum: "$orderTotalAmount" },
                totalDiscounts: { $sum: "$orderDiscountAmount" },
                totalProductsSold: { $sum: "$itemsInOrder" },
                totalOrders: { $sum: 1 }
            }
        },
        {
            $project: {
                _id: 0,
                totalSales: 1,
                totalDiscounts: 1,
                totalProductsSold: 1,
                totalOrders: 1
            }
        }
    ]);
    return result.length > 0 ? result[0] : { totalSales: 0, totalDiscounts: 0, totalProductsSold: 0, totalOrders: 0 };
};


// Retrieve 'date/time' data for 'display' 'sales overview' as 'line charts'
export const getSalesChartData = async (matchQuery, groupFormat) => {
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


// Retrieve data  of 'paymentMethod' for display it in 'Doughnut Chart'
export const getPaymentMethodStats = async (matchQuery) => {
    return await Order.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: "$paymentMethod",
                revenue: { $sum: "$totalAmount" },
                count: { $sum: 1 }
            }
        }
    ]);
};


// Retrieve data for 'order list'
export const getDetailedOrdersList = async (matchQuery, page = 1, limit = 10) => {
    const options = {
        page: page,
        limit: limit,
        sort: { createdAt: -1 },
        populate: [
            { path: 'user', select: 'firstName lastName email' },
            { path: 'items.product', select: 'name category images' }
        ],
        lean: true
    };
    return await paginate(Order, matchQuery, options);
};