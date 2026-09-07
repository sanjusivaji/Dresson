import Order from '../../model/orderModel.js';
import paginate from '../../utilities/paginationHelper.js';

// It retrieve 'totalSales','totalDiscounts', 'totalProductsSold', 'totalOrders' like values for 'dynamic' display based on 'matchQuery'(ie 'date ranges' and 'status') 
export const getAggregateMetrics = async (matchQuery) => {
    const result = await Order.aggregate([
        { $match: matchQuery },                                                   // It return a 'matching' document based on 'matchQuery' and it contains 'items' array
        { $unwind: { path: "$items", preserveNullAndEmptyArrays: true } },        // 'path' is built-in property in 'mongodb' and it tells the '$unwind' stage exactly which 'array field' inside the 'document' want 'flatten' and normally '$unwind' removes 'empty' arrays, but 'preserveNullAndEmptyArrays: true' makes include that empty arrays when 'destructuring' time.
        {
            $group: {
                _id: "$_id",
                orderTotalAmount: { $first: "$totalAmount" },                     // Grabs the true order total once per order
                orderDiscountAmount: { $first: "$discountAmount" },
                itemsInOrder: { $sum: { $ifNull: ["$items.quantity", 0] } }       // Here it checks if 'item.quantity' is 'null' or this 'field' not yet in items, then it adds '0' instead and it 'prevents' the 'crashing the app and '$ifNull: ["checkingField", 'replacing value']' is the syntax of '$ifNull'.
            }
        },        
        {
            $group: {                                                             // Here '$group' grouping all data based '_id: null', so we can 'calculate' 'grandTotal' etc without consider 'paymentMethods'(ie '_id: paymentMethod'), 'category' etc.
                _id: null,
                totalSales: { $sum: "$orderTotalAmount" },                        // Here we assign 'totalSales' as 'sum' of 'orderTotalAmount' (safely gathered from the stage above)
                totalDiscounts: { $sum: "$orderDiscountAmount" },
                totalProductsSold: { $sum: "$itemsInOrder" },
                totalOrders: { $sum: 1 }                                          // Since we already grouped by unique order ID above, we can just sum 1 to count unique orders instead of using $addToSet
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
                _id: { $dateToString: { format: groupFormat, date: "$createdAt", timezone: "Asia/Kolkata" } },  // '$dateToString' operator used for 'extracts' specific 'part' of the 'date'(ie by using 'date: "$createdAt") and adjust 'local timezone'(ie by using 'timezone: "Asia/Kolkata")and covert into string and 'structuring' based on 'groupFormat'(ie it passes as argument Eg, '"%Y-%m-%d"). 
                revenue: { $sum: "$totalAmount" }
            }
        },
        { $sort: { "_id": 1 } }                                                      // Here '_id' belongs to 'date' so it 'sorted' the 'date', 'oldest' first
    ]);
};

// Retrieve data for the Doughnut Chart
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