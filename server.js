import express from 'express';
import dotenv from 'dotenv';
import connectDB from './src/config/dbConnect.js'; 
import adminRoutes from './src/routes/adminRoute.js'; 
import session from 'express-session';
import userRoute from './src/routes/userRoute.js';
import passport from './src/config/passport.js'; 
import logger from './src/utilities/logger.js';
import { globalErrorHandler } from './src/middleware/errorMiddleware.js';
// import path from 'path';
// import { fileURLToPath } from 'url'; 
import expressLayouts from 'express-ejs-layouts';


dotenv.config();
const app = express();

app.set('view engine', 'ejs');
app.set('views', './view'); 
app.set('layout', 'layout/admin');

 app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(expressLayouts);

// For embedding 'session' to store the 'OTP' and User Data
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }           // If we use 'HTTPS' we can change it into '{secure:true}'
}));

// For debugging purpose
app.get('/test', (req, res) => {
    res.send("YES! SERVER.JS IS ALIVE AND UPDATING!");
});


app.use(passport.initialize());
app.use(passport.session());
app.use('/', userRoute);
app.use('/admin', adminRoutes);


// Global error middleware 
app.use(globalErrorHandler);

// For create 'server' and connect to 'mongodb'
const PORT = process.env.PORT || 3000;
connectDB().then(() => {                                                       // 'connectDb' is 'asynchronous' operation and return 'Promise' object, so we use 'then()'
    app.listen(PORT, () => {
        logger.info(` Dresson Server is running on http://localhost:${PORT}`);
    });
});



