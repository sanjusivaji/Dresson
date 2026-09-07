import ExcelJS from 'exceljs';

export const generateSalesExcel = async (reportData) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');

    // Define Spreadsheet Columns
    worksheet.columns = [
        { header: 'Order ID', key: 'orderId', width: 25 },
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Customer', key: 'customer', width: 20 },
        { header: 'Payment Method', key: 'payment', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Discount (INR)', key: 'discount', width: 15 },
        { header: 'Total (INR)', key: 'total', width: 15 }
    ];

    // Style the Header Row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
    };

    // Add Data Rows
    reportData.orders.forEach(order => {
        worksheet.addRow({
            orderId: order.orderId,
            date: new Date(order.createdAt).toLocaleDateString('en-IN'),
            customer: order.shippingAddress?.fullName || order.user?.firstName || 'N/A',
            payment: order.paymentMethod,
            status: order.deliveryStatus,
            discount: order.discountAmount || 0,
            total: order.totalAmount
        });
    });

    // Generate and return the buffer
    return await workbook.xlsx.writeBuffer();
};