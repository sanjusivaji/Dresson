
import logger from '../utilities/logger.js';
export const globalErrorHandler = (err, req, res, next) => {

    logger.error("Global Error Handler caught:", err.stack);
    const statusCode = err.statusCode || 500;               // For status code
    const message = err.message || "Internal Server Error";

    // If it's an AJAX/Fetch request, return JSON
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
        return res.status(statusCode).json({
            success: false,
            message: message
        });
    }

    // For standard page requests, render an error page
    res.status(statusCode).render('error', {
        pageTitle: "Error",
        message: message,
        statusCode: statusCode,
        layout: 'layout/user' // Using your existing layout
    });
};