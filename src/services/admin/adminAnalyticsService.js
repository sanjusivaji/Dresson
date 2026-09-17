import * as analyticsRepo from '../../repository/admin/adminAnalyticsRepository.js';
import { QUICK_FILTERS } from '../../constants/analyticsConstants.js';


// Calculates all the numbers, chart points, and order lists needed for the report
export const generateReportData = async (query) => {
    const { filter, startDate, endDate, status, page = 1 } = query;
    let matchStage = {};
    let groupFormat = "%Y-%m-%d"; 
    if (status) {
        if (status === 'Return Pending') {
            matchStage.$or = [
                { 'returnRequest.status': 'Pending' }, 
                { 'items.itemStatus': 'Return Pending' }
            ];
        } else if (status === 'Return Refunded') {
            matchStage.$or = [
                { 'returnRequest.status': 'Refunded' }, 
                { 'items.itemStatus': 'Returned' }, 
                { deliveryStatus: 'Returned' }
            ];
        } else if (status === 'Return Rejected') {
            matchStage.$or = [
                { 'returnRequest.status': 'Rejected' }, 
                { 'items.itemStatus': 'Return Rejected' }
            ];
        } else if (status === 'Cancelled') {
            matchStage.$or = [
                { deliveryStatus: 'Cancelled' }, 
                { 'items.itemStatus': 'Cancelled' }
            ];
        } else {
            matchStage.deliveryStatus = status;
        }
    }
    if (startDate && endDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchStage.createdAt = { $gte: start, $lte: end };
        const daysDiff = (end - start) / (1000 * 60 * 60 * 24);
        if (daysDiff <= 1) groupFormat = "%H:00";
        else if (daysDiff > 31) groupFormat = "%Y-%m";
    } else {
        const now = new Date();
        let start = new Date();
        start.setHours(0, 0, 0, 0);
        if (filter === QUICK_FILTERS.DAILY) {
            groupFormat = "%H:00";
        } else if (filter === QUICK_FILTERS.SEVEN_DAYS) {
            start.setDate(now.getDate() - 7);
        } else if (filter === QUICK_FILTERS.MONTHLY) {
            start.setDate(now.getDate() - 30);
        } else {
            start.setFullYear(now.getFullYear() - 5);
            groupFormat = "%Y";
        }        
        matchStage.createdAt = { $gte: start };
    }
    const limit = 10; 
    const [metrics, rawChartData, rawPaymentData, paginatedOrders] = await Promise.all([
        analyticsRepo.getAggregateMetrics(matchStage),
        analyticsRepo.getSalesChartData(matchStage, groupFormat),
        analyticsRepo.getPaymentMethodStats(matchStage),
        analyticsRepo.getDetailedOrdersList(matchStage, page, limit)
    ]);
    const chartLabels = rawChartData.map(item => item._id);
    const chartData = rawChartData.map(item => item.revenue);
    let paymentStats = { razorpay: 0, cod: 0, wallet: 0, card: 0 };
    let totalPaymentRevenue = metrics.totalSales || 1; 
    rawPaymentData.forEach(p => {
        const method = p._id ? p._id.toUpperCase() : '';
        if (method.includes('RAZORPAY')) paymentStats.razorpay += p.revenue; 
        else if (method.includes('COD')) paymentStats.cod += p.revenue;
        else if (method.includes('WALLET')) paymentStats.wallet += p.revenue;
        else if (method.includes('CARD')) paymentStats.card += p.revenue;
    });
    paymentStats.razorpayPercent = Math.round((paymentStats.razorpay / totalPaymentRevenue) * 100);
    paymentStats.codPercent = Math.round((paymentStats.cod / totalPaymentRevenue) * 100);
    paymentStats.walletPercent = Math.round((paymentStats.wallet / totalPaymentRevenue) * 100);
    paymentStats.cardPercent = Math.round((paymentStats.card / totalPaymentRevenue) * 100);
    return {
        stats: metrics,
        chartLabels,
        chartData,
        paymentStats,
        orders: paginatedOrders.results,
        currentPage: paginatedOrders.currentPage,
        totalPages: paginatedOrders.totalPages,
        currentFilter: filter || QUICK_FILTERS.YEARLY,
        startDate: startDate || '',
        endDate: endDate || '',
        status: status || '',
        queryString: new URLSearchParams(query).toString() 
    };
};