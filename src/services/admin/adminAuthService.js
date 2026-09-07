import bcrypt from 'bcrypt';
import * as adminAuthRepository from '../../repository/admin/adminAuthRepository.js';
import { ADMIN_ROLES } from '../../constants/adminAuthConstants.js';

// For 'verify' admin
export const verifyAdminCredentials = async (email, password) => {
    const adminUser = await adminAuthRepository.findAdminByEmail(email, ADMIN_ROLES.SUPER_ADMIN);
    if (!adminUser) {
        throw new Error("Access Denied: Invalid administrative credentials.");
    }
    const passwordMatch = await bcrypt.compare(password, adminUser.password);        
    if (!passwordMatch) {
        throw new Error("Access Denied: Invalid administrative credentials.");
    }        
    return adminUser;
};

// For 'display' 'dashboard' page and rendering through 'adminController.js' file
export const getDashboardData = async (filter) => {
    const now = new Date();
    let chartStartDate = new Date();
    let groupFormat = "%Y";
    
    if (filter === 'daily') {
        chartStartDate.setHours(0, 0, 0, 0); // Start of today
        groupFormat = "%H:00";               // Group chart by hour of the day
    } else if (filter === '7days') {
        chartStartDate.setDate(now.getDate() - 7);
        chartStartDate.setHours(0, 0, 0, 0);
        groupFormat = "%Y-%m-%d";            // Group chart by day
    } else if (filter === 'monthly') {
        chartStartDate.setDate(now.getDate() - 30); // Last 30 days
        chartStartDate.setHours(0, 0, 0, 0);
        groupFormat = "%Y-%m-%d";            // Group chart by day
    } else {
        // yearly / default
        chartStartDate.setFullYear(now.getFullYear() - 5);
        chartStartDate.setHours(0, 0, 0, 0);
        groupFormat = "%Y";                  // Group chart by year
    }
    
    const dateFilter = { createdAt: { $gte: chartStartDate } };
    const deliveredMatch = { deliveryStatus: 'Delivered', ...dateFilter };
    
    // Execute all independent repository queries concurrently for maximum performance
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
    ] = await Promise.all([
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
    
    const totalItemsSold = totalItemsAgg.length > 0 ? totalItemsAgg[0].totalQuantity : 1; 

    const products = topProductsAgg.map(p => {
        let imageUrl = "https://via.placeholder.com/100";
        if (p.productDetails?.images && p.productDetails.images.length > 0) {
            const firstImg = p.productDetails.images[0];
            imageUrl = typeof firstImg === 'object' ? (firstImg.url || firstImg.path || imageUrl) : firstImg;
        }
        return {
            image: imageUrl,
            name: p.productDetails?.name || "Unknown Product",
            category: p.catDetails?.categoryName || p.productDetails?.parentCategory || "Uncategorized",
            price: p.soldPrice || 0,
            sold: p.sold || 0,
            revenue: p.revenue || 0,
            stock: p.productDetails?.totalStock || p.productDetails?.stock || 0,
            date: p.lastSold
        };
    });

    const categories = topCategoriesAgg.map(cat => ({
        name: cat._id ? cat._id.toString() : "Uncategorized",
        percentage: Math.round((cat.sold / totalItemsSold) * 100)
    }));
    
    const brands = topBrandsAgg.map(brand => ({
        name: brand._id ? brand._id.toString() : "Generic",
        percentage: Math.round((brand.sold / totalItemsSold) * 100)
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