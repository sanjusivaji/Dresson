import * as adminAnalyticsService from '../../services/admin/adminAnalyticsService.js';
import { generateSalesExcel } from '../../utilities/excelGenerator.js';
import { generateSalesPDF } from '../../utilities/pdfGenerator.js';
import logger from '../../utilities/logger.js';

export const loadAnalyticsPage = async (req, res) => {
    try {
        const reportData = await adminAnalyticsService.generateReportData(req.query);
        res.render('admin/analytics', {
            ...reportData,
            pageTitle: "Sales Report - Dresson",
            activePage: 'analytics' 
        });
    } catch (error) {
        logger.error("Analytics Load Error: ", error.message);
        res.status(500).send("An error occurred while loading the sales report.");
    }
};

export const exportReportExcel = async (req, res) => {
    try {
        const reportData = await adminAnalyticsService.generateReportData(req.query);
        const excelBuffer = await generateSalesExcel(reportData);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Dresson_Sales_Report.xlsx');
        res.send(excelBuffer);
    } catch (error) {
        logger.error("Excel Generation Error: ", error);
        res.status(500).send("Error generating Excel report.");
    }
};


export const exportReportPDF = async (req, res) => {
    try {
        const reportData = await adminAnalyticsService.generateReportData(req.query);
        const pdfBuffer = await generateSalesPDF(reportData);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=Dresson_Sales_Report.pdf');
        res.send(pdfBuffer);
    } catch (error) {
        logger.error("PDF Generation Error: ", error);
        res.status(500).send("Error generating PDF report.");
    }
};   