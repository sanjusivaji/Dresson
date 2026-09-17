
import bcrypt from 'bcrypt';
import * as adminAuthRepository from '../../repository/admin/adminAuthRepository.js';
import { ADMIN_ROLES } from '../../constants/adminAuthConstants.js';



// For 'verify' admin
export const verifyAdminCredentials = async (email, password) => {
    const adminUser = await adminAuthRepository.findAdminByEmail(email, ADMIN_ROLES.SUPER_ADMIN);
    if (!adminUser) {
        throw new Error("Access Denied: Invalid administrative credentials.");
    }
    const passwordMatch = await bcrypt.compare(password, adminUser.password);                                                         // Verify hashed password matches
    if (!passwordMatch) {
        throw new Error("Access Denied: Invalid administrative credentials.");
    }
    return adminUser;
};



// For 'calculate' 'dashboard' data like 'top categories', 'top brands', 'products' etc and rendering through 'adminController.js' file
export const getDashboardData = async (filter) => {
    const now = new Date();
    let chartStartDate = new Date();
    let groupFormat = "%Y";
    if (filter === 'daily') {
        chartStartDate.setHours(0, 0, 0, 0);                                                                                          // Set time to midnight for exact daily start
        groupFormat = "%H:00";                                                                                                        // Group chart by hour of the day
    } else if (filter === '7days') {
        chartStartDate.setDate(now.getDate() - 7);                                                                                    // Go back 7 days from today
        chartStartDate.setHours(0, 0, 0, 0);
        groupFormat = "%Y-%m-%d";                                                                                                     // Group chart by day
    } else if (filter === 'monthly') {
        chartStartDate.setDate(now.getDate() - 30);                                                                                   // Go back 30 days from today
        chartStartDate.setHours(0, 0, 0, 0);
        groupFormat = "%Y-%m-%d";                                                                                                     // Group chart by day
    } else {
        chartStartDate.setFullYear(now.getFullYear() - 5);                                                                            // Default to yearly, going back 5 years
        chartStartDate.setHours(0, 0, 0, 0);
        groupFormat = "%Y";                                                                                                           // Group chart by year
    }
    const dateFilter = { createdAt: { $gte: chartStartDate } };                                                                       // Filter records created after start date
    const deliveredMatch = { deliveryStatus: 'Delivered', ...dateFilter };
    const [
        salesAgg,
        totalOrders,
        activeOrders,
        newUsers,
        chartAgg,
        totalItemsAgg,
        topProductsAgg,
        topCategoriesAgg,
        topBrandsAgg
    ] = await Promise.all([                                                                                                           // Run database queries together to save time
        adminAuthRepository.getSalesAggregate(deliveredMatch),
        adminAuthRepository.countOrders(dateFilter),
        adminAuthRepository.countOrders({ deliveryStatus: { $in: ['Pending', 'Processing', 'Shipped'] }, ...dateFilter }),
        adminAuthRepository.countUsers({ role: 'user', ...dateFilter }),
        adminAuthRepository.getChartAggregate(deliveredMatch, groupFormat),
        adminAuthRepository.getTotalItemsAggregate(deliveredMatch),
        adminAuthRepository.getTopProductsAggregate(deliveredMatch),
        adminAuthRepository.getTopCategoriesAggregate(deliveredMatch),
        adminAuthRepository.getTopBrandsAggregate(deliveredMatch)
    ]);
    const totalSales = salesAgg.length > 0 ? salesAgg[0].total : 0;
    const chartLabels = chartAgg.map(item => item._id);
    const chartData = chartAgg.map(item => item.revenue);
    const totalChartRevenue = chartData.reduce((acc, val) => acc + val, 0);
    const totalItemsSold = totalItemsAgg.length > 0 ? totalItemsAgg[0].totalQuantity : 1;                                             // Default to 1 to avoid math error when dividing
    const products = topProductsAgg.map(item => {
        let imageUrl = "https://via.placeholder.com/100";                                                                             // Set a fallback image if none exists
        if (item.productDetails?.images && item.productDetails.images.length > 0) {
            const firstImg = item.productDetails.images[0];
            imageUrl = typeof firstImg === 'object' ? (firstImg.url || firstImg.path || imageUrl) : firstImg;
        }
        return {
            image: imageUrl,
            name: item.productDetails?.name || "Unknown Product",
            category: item.catDetails?.categoryName || item.productDetails?.parentCategory || "Uncategorized",
            price: item.soldPrice || 0,
            sold:item.sold || 0,
            revenue: item.revenue || 0,
            stock: item.productDetails?.totalStock || item.productDetails?.stock || 0,
            date: item.lastSold
        };
    });
    const categories = topCategoriesAgg.map(item => ({
        name: item._id ? item._id.toString() : "Uncategorized",
        percentage: Math.round((item.sold / totalItemsSold) * 100)                                                                    // Calculate percentage out of total items sold
    }));
    const brands = topBrandsAgg.map(item => ({
        name: item._id ? item._id.toString() : "Generic",
        percentage: Math.round((item.sold / totalItemsSold) * 100)
    }));
    return {
        stats: { totalSales, totalOrders, activeOrders, newUsers },
        chartLabels,
        chartData,
        totalChartRevenue,
        products,
        brands,
        categories
    };
};