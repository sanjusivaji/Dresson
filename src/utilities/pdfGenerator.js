import puppeteer from 'puppeteer';
import ejs from 'ejs';
import path from 'path';

export const generateSalesPDF = async (reportData) => {
    const templatePath = path.join(process.cwd(), 'view', 'admin', 'reportTemplate.ejs');
    const html = await ejs.renderFile(templatePath, reportData);
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ 
        format: 'A4', 
        printBackground: true,
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
    });
    
    await browser.close();
    return pdfBuffer;
};