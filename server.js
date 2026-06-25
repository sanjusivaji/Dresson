import express from 'express';
import dotenv from 'dotenv';
import connectDB from './src/config/dbConnect.js'; // 1. Import your new utility
import adminRoutes from './src/routes/adminRoute.js'; 
import session from 'express-session';
import userRoute from './src/routes/userRoute.js';
import passport from './src/config/passport.js'; // Import your new config file
// import path from 'path';
// import { fileURLToPath } from 'url'; 
import expressLayouts from 'express-ejs-layouts';


dotenv.config();
const app = express();

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

app.set('view engine', 'ejs');
app.set('views', './view'); 
app.set('layout', 'layout/admin');

 app.use(express.static('public'));
// app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(expressLayouts);

// Enable sessions to temporarily store the OTP and User Data
app.use(session({
    secret: 'dresson_secure_secret_key', // In production, move this to your .env file!
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true later if you use HTTPS
}));

// THE NUCLEAR DEBUG ROUTE
app.get('/test', (req, res) => {
    res.send("YES! SERVER.JS IS ALIVE AND UPDATING!");
});


app.use(passport.initialize());
app.use(passport.session());
app.use('/', userRoute);
app.use('/admin', adminRoutes);


const PORT = process.env.PORT || 3000;

// 2. Fire the connection function, THEN start the server
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(` Dresson Server is running on http://localhost:${PORT}`);
    });
});

