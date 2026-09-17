//  'Error handling' middleware handle almost all type of errors like ReferenceError, TypeError, SyntaxError, etc inside an application because we declare it globally and apply this in 'server.js' file at 'last'(ie 'app.use(globalErrorHandler)').
import logger from '../utilities/logger.js';
export const globalErrorHandler = (err, req, res, next) => {
    console.error("This is for display error", err);
    logger.error("Global Error Handler caught:", err.stack);
    const statusCode = err.statusCode || 500;                 
    const message = err.message || "Internal Server Error";
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {                                                               // If it's an AJAX(ie 'fetch' or 'ajio')request or 'xhr' request return JSON
        return res.status(statusCode).json({
            success: false,
            message: message
        });
    }
    res.status(statusCode).render('partial/user/error', {                                                                     // For standard page requests, render an error page
        pageTitle: "Error",
        message: message,
        statusCode: statusCode,
        layout: 'layout/user' 
    });
};