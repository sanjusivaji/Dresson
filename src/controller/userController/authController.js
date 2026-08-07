import logger from '../../utilities/logger.js';
import * as authService from '../../services/user/authService.js';
import { COOKIE_KEYS, SESSION_KEYS } from '../../constants/cookieConstants.js';
import * as userProductService from '../../services/user/userProductServices.js';

// For 'display' sign up page
export const loadSignUp = async (req,res) => {
    res.render('user/signup', {
        layout: 'layout/auth',
        pageTitle: "Sign up - Dresson"
    })
}

// For 'processing' the sign up
export const processSignUp = async (req, res) => {
    try {
        const registrationData = await authService.initiateUserRegistration(req.body);  // Here the function give 'validation' in 'sign up' page and 'generate' and 'send' the 'OTP' to email(by using 'utilities/emailSender.js' file)and 'return' an 'object' contains 'tempUser'(ie it contains '{ name, email, password, referralCode}' etc), Otp(ie for 'compare' with 'user' typed 'otp') and 'otp' 'expiry time'.       
        req.session.tempUser = registrationData.tempUser;                               // Here we 'store' the 'session' properties for 'future' uses because even 'redirection' time, 'server' becomes 'stateless'.
        req.session.otp = registrationData.otp;
        req.session.otpExpiry = registrationData.otpExpiry;   
        // res.redirect('/verify-otp');
        return res.status(200).json({
            success: true,
            message: "OTP sent successfully to your email."
        });
    } catch (error) {
        logger.error("Signup processing error:", error);
        return res.status(400).json({
            success: false,
            message: error.message || "Internal Server Error"
        });
    }
};

// For 'display' 'OTP' page
export const loadOtpPage = (req, res) => {
    if (!req.session.tempUser) return res.redirect('/signup'); 
    res.render('user/verify-otp', { 
        layout: 'layout/user', 
        pageTitle: "Verify OTP - Dresson" 
    });
};

// For 'verifying' 'OTP' after type in 'OTP' page
export const verifyOtp = async (req, res) => {
    try {
        await authService.verifyAndRegisterUser(req.session, req.body.otp); // Here arguments are 'req.session'(ie it created in 'server.js' and we retrieve in just before 'processSignUp()' function) and 'req.body.otp'(ie 'req.body' is created when the user types their 'OTP' into '<form>')   
        delete req.session.tempUser;                                        // Here 'delete' property used for 'deleting' only 'some' properties(ie like 'tempUser', 'otp' etc) of 'session'(ie because we did 'not' no longer need this and 'session' object created from 'server.js' and it will 'remove' 'only' when we use 'destroy()' method)
        delete req.session.otp;
        delete req.session.otpExpiry;
        return res.status(200).json({                                       // Here we 'return' 'success: true' into 'view/user/signup.ejs' as response and there we 'redirect' into '/login' if it is successfully signed up.
            success: true,
            message: "Account verified successfully!"
        });

    } catch (error) {
        logger.error("OTP Verification error:", error.message);
        return res.status(400).json({
            success: false,
            message: error.message || "Invalid OTP."
        });
    }
};


// For 'display' 'login' page
export const loadLogin = (req, res) => {
    if (req.session.user) return res.redirect('/');  // If 'user' is already 'logedIn' then it directly go to 'home'.
    res.render('user/login', {
        error: null,
        layout: 'layout/auth', 
        pageTitle: "Login - Dresson"
    });
};

// For 'processing' the 'user login'
export const processLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await authService.authenticateLocalUser(email, password);  // It checks is this 'user' or not and 'return' 'user' details     
        if (!user) {
            return res.render('login', { error: 'Invalid email or password' });
        }
        if (user.isBlocked === true || user.status === 'Blocked') {
            return res.render('user/login', { 
                error: 'Your account has been blocked by the Administrator. Please contact support.' ,
                layout: 'layout/auth'
            });
        }
        req.session.user = user._id;
        res.redirect('/');
    } catch (error) {
        logger.error("Login Error:", error);
        res.render('user/login', { 
            error: error.message || "Internal Server Error",
            layout: 'layout/auth',
            pageTitle: "Login - Dresson" 
        });
    }
};

// For 'display' 'forgot password' page
export const loadForgotPassword = async (req, res) => {
    try {
        res.render('user/forgotPassword', { 
            layout: 'layout/user', 
            pageTitle: "Forgot Password - Dresson" 
        }); 
    } catch (error) {
        logger.error("Error loading forgot password page:", error);
        res.status(500).send("Server Error");
    }
};

// For 'process' forgot password ie generate 'otp' and 'send' it to 'email' with 'reset' mode
export const processForgotPassword = async (req, res) => {
    try {
        const otp = await authService.initiatePasswordReset(req.body.email);  // It generate 'otp' and 'send' it to 'email' with 'reset' mode and also 'return' this 'otp' for future comparison.
        req.session.forgotOtp = otp;
        req.session.forgotEmail = req.body.email;
        res.redirect('/forgot-otp');                                         // Redirecting into display 'OTP Page'(ie we call the function 'loadForgotOtpPage()' written below from 'routes/userRoutes.js/'forgot-otp' ) and 'verify otp'(ie created below as 'verifyForgotOtp()' call from 'routes/userRoutes.js') 
    } catch (error) {
        logger.error("Forgot Password Error:", error);
        res.send(error.message || "Server Error");
    }
};

// For display 'OTP' page and we call this function from above mentioned 'route'(ie '/forgot-otp')
export const loadForgotOtpPage = async (req, res) => {
    try {
        if (!req.session.forgotEmail) return res.redirect('/forgot-password'); // If 'email' is not stored in 'session' we redirect into display 'forgot password' page and then send 'OTP'
        res.render('user/verify-otp-forgotPas', {                              // It is for 'display' 'OTP' page with 'count down timer'
            layout: 'layout/user', 
            pageTitle: "Verify OTP - Dresson" 
        });
    } catch (error) {
       logger.error("Error loading OTP page:", error);
        res.status(500).send("Server Error");
    }
};

// For check is the 'email' and 'otp' exist or not when 'loading' the 'OTP' and we call this function from above mentioned 'route'(ie '/forgot-otp')
export const verifyForgotOtp = async (req, res) => {
    try {
        if (!req.session.forgotEmail || !req.session.forgotOtp) {
            return res.send("Session expired. Please request a new password reset link.");
        }
        if (req.body.otp !== req.session.forgotOtp) {
            return res.send("Invalid OTP. Please try again.");
        }
        req.session.forgotOtpVerified = true;        // Above we just check 'session' has 'email'(ie 'forgotEmail') and 'otp'(ie 'forgotOtp')and if it is we assign 'forgotOtpVerified = true' into 'session'.
        res.redirect('/reset-password');             // This route handle 'display' 'set new password' page and further proccing.
    } catch (error) {
        logger.error("Forgot OTP Verification Error:", error);
        res.status(500).send("Server Error");
    }
};

// For 'display' page for entering 'new password', after 'verified' the 'OTP'
export const loadResetPassword = async (req, res) => {
    try {
       if (!req.session.forgotEmail || !req.session.forgotOtpVerified) {    
            return res.redirect('/forgot-password'); 
        }
        res.render('user/newPassword', {                 // To 'display' 'new password' typing page.
            layout: 'layout/user', 
            pageTitle: "Reset Password - Dresson" 
        });
    } catch (error) {
        logger.error("Error loading reset password page:", error);
        res.status(500).send("Server Error");
    }
};

// For 'processing' after entering the 'new password'
export const processResetPassword = async (req, res) => {
    try {
        await authService.executeForgottenPasswordReset(req.session, req.body.password, req.body.confirmPassword); // We call this function with '3' arguments(ie 'session','password', 'confirmPassword')and it update the 'email' with 'new password'.     
        delete req.session.forgotEmail;                                                                            // After updation 'delete' 'email', 'otp' and 'verification'(ie it is a 'boolean' value).  
        delete req.session.forgotOtp;
        delete req.session.forgotOtpVerified;        
        res.redirect('/login');
    } catch (error) {
        console.error("Reset Password Error:", error);
        res.send(error.message || "Server Error");
    }
};

// For 'logout' process
export const processLogout = (req, res) => {
    if (req.session.user) {                              // Here 'delete' the 'user'(ie 'user' is the object that contains 'name','email' etc)instead 'destroy' entire session.
        delete req.session.user; 
    }
    if (req.session[SESSION_KEYS.USER_SESSION]) {
        delete req.session[SESSION_KEYS.USER_SESSION];   // Here 'delete' the 'user'(ie 'user' is the object that contains 'name','email' etc)instead 'destroy' entire session.
    }
    if (req.session.admin) {                             // Here we check if an 'Admin' is still logged in(ie if 'admin' logged in it store)
        return req.session.save((err) => {
            if (err) {
                console.error("Session Save Error during User Logout:", err);
                return res.status(500).send("Failed to log out cleanly.");
            }
            res.redirect('/login');
        });
    }
    req.session.destroy((err) => {
        if (err) {
            console.error("Session Destruction Error:", err);
            return res.status(500).send("Failed to log out cleanly.");
        }
        res.clearCookie('connect.sid');
        res.redirect('/login');
    });
};


// For display 'home' page
export const loadHome = async (req, res) => {
    try {
        const catalogData = await userProductService.compileShopCatalog(req.query);  // 'compileShopCatalog()' retrieve data of 'products' based on each page
        res.render('user/home', {
            ...catalogData,                                                          // Automatically unpacks: products, categories, totalProducts, totalPages, currentPage, currentSort, etc.
            query: req.query,                                                        // Essential: allows pagination links to remember active filters
            layout: 'layout/user', 
            pageTitle: "Home - Dresson"      
        });
    } catch (error) {
        logger.error("Home Page Error:", error);
        res.status(500).send("Server Error");
    }
};






