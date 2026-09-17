import * as adminAnalyticsService from '../../services/admin/adminAnalyticsService.js';
import { generateSalesExcel } from '../../utilities/excelGenerator.js';
import { generateSalesPDF } from '../../utilities/pdfGenerator.js';
import logger from '../../utilities/logger.js';


// For 'display' 'analytics' page
export const loadAnalyticsPage = async (req, res) => {
    try {
        const reportData = await adminAnalyticsService.generateReportData(req.query);                                     // Collects all the math and chart data for the page
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


// For 'downloads' the current sales report as an 'Excel' spreadsheet
export const exportReportExcel = async (req, res) => {
    try {
        const reportData = await adminAnalyticsService.generateReportData(req.query);
        const excelBuffer = await generateSalesExcel(reportData);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');              // Tells the browser to handle this as an Excel file
        res.setHeader('Content-Disposition', 'attachment; filename=Dresson_Sales_Report.xlsx');
        res.send(excelBuffer);
    } catch (error) {
        logger.error("Excel Generation Error: ", error);
        res.status(500).send("Error generating Excel report.");
    }
};


// For 'downloads' the current sales report as a 'PDF' document
export const exportReportPDF = async (req, res) => {
    try {
        const reportData = await adminAnalyticsService.generateReportData(req.query);
        const pdfBuffer = await generateSalesPDF(reportData);
        res.setHeader('Content-Type', 'application/pdf');                                                            // Tells the browser to handle this as a PDF file
        res.setHeader('Content-Disposition', 'attachment; filename=Dresson_Sales_Report.pdf');
        res.send(pdfBuffer);
    } catch (error) {
        logger.error("PDF Generation Error: ", error);
        res.status(500).send("Error generating PDF report.");
    }
};