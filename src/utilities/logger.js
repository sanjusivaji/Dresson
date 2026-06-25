
import winston from 'winston';

const logger = winston.createLogger({
    level: 'info',             // Records everything 'info' and more severe (warn, error)
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json() // Formats logs as JSON so they are easy to search later
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),  // Save all errors to a file called 'error.log'
        new winston.transports.File({ filename: 'logs/combined.log' })                // Save absolutely everything to a file called 'combined.log'
    ],
});
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({                                       //  If we are just testing on our laptop, also print to the terminal in neat colors
        format: winston.format.simple(),
    }));
}

export default logger;