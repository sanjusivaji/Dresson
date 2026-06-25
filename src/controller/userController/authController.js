import logger from '../../utilities/logger.js';
import * as authService from '../../services/user/authService.js';

const loadSignUp = (req, res) => {
    res.render('user/signup', { 
        layout: 'layout/user', 
        pageTitle: "Sign Up - Dresson" 
    });
};

const processSignUp = async (req, res) => {
    try {
        const registrationData = await authService.initiateUserRegistration(req.body);
        
        req.session.tempUser = registrationData.tempUser;
        req.session.otp = registrationData.otp;
        req.session.otpExpiry = registrationData.otpExpiry;
        
        res.redirect('/verify-otp');
    } catch (error) {
        console.error("Signup processing error:", error);
        res.send(error.message || "Internal Server Error");
    }
};

const loadOtpPage = (req, res) => {
    if (!req.session.tempUser) return res.redirect('/signup'); 
    res.render('user/verify-otp', { 
        layout: 'layout/user', 
        pageTitle: "Verify OTP - Dresson" 
    });
};

const verifyOtp = async (req, res) => {
    try {      
        await authService.verifyAndRegisterUser(req.session, req.body.otp);
        
        delete req.session.tempUser; 
        delete req.session.otp;
        delete req.session.otpExpiry;
        
        res.redirect('/login');
    } catch (error) {
        logger.error("OTP Verification Error:", error);
        res.send(error.message || "Server Error");
    }
};

const loadLogin = (req, res) => {
    if (req.session.user) return res.redirect('/'); 
    res.render('user/login', { 
        error: null,
        layout: 'layout/user', 
        pageTitle: "Login - Dresson"
    });
};

const processLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await authService.authenticateLocalUser(email, password);
        
        req.session.user = user._id;
        res.redirect('/');
    } catch (error) {
        console.error("Login Error:", error);
        res.render('user/login', { 
            error: error.message || "Internal Server Error",
            layout: 'layout/user', 
            pageTitle: "Login - Dresson" 
        });
    }
};

const loadForgotPassword = async (req, res) => {
    try {
        res.render('user/forgotPassword', { 
            layout: 'layout/user', 
            pageTitle: "Forgot Password - Dresson" 
        }); 
    } catch (error) {
        console.error("Error loading forgot password page:", error);
        res.status(500).send("Server Error");
    }
};

const processForgotPassword = async (req, res) => {
    try {
        const otp = await authService.initiatePasswordReset(req.body.email);
        req.session.forgotOtp = otp;
        req.session.forgotEmail = req.body.email;
        res.redirect('/forgot-otp');
    } catch (error) {
        console.error("Forgot Password Error:", error);
        res.send(error.message || "Server Error");
    }
};

const loadForgotOtpPage = async (req, res) => {
    try {
        if (!req.session.forgotEmail) return res.redirect('/forgot-password');
        res.render('user/verify-otp-forgotPas', {
            layout: 'layout/user', 
            pageTitle: "Verify OTP - Dresson" 
        });
    } catch (error) {
        console.error("Error loading OTP page:", error);
        res.status(500).send("Server Error");
    }
};

const verifyForgotOtp = async (req, res) => {
    try {
        if (!req.session.forgotEmail || !req.session.forgotOtp) {
            return res.send("Session expired. Please request a new password reset link.");
        }
        if (req.body.otp !== req.session.forgotOtp) {
            return res.send("Invalid OTP. Please try again.");
        }
        req.session.forgotOtpVerified = true;
        res.redirect('/reset-password');
    } catch (error) {
        console.error("Forgot OTP Verification Error:", error);
        res.status(500).send("Server Error");
    }
};

const loadResetPassword = async (req, res) => {
    try {
       if (!req.session.forgotEmail || !req.session.forgotOtpVerified) {    
            return res.redirect('/forgot-password'); 
        }
        res.render('user/newPassword', { 
            layout: 'layout/user', 
            pageTitle: "Reset Password - Dresson" 
        });
    } catch (error) {
        console.error("Error loading reset password page:", error);
        res.status(500).send("Server Error");
    }
};

const processResetPassword = async (req, res) => {
    try {
        await authService.executeForgottenPasswordReset(req.session, req.body.password, req.body.confirmPassword);
        
        delete req.session.forgotEmail;
        delete req.session.forgotOtp;
        delete req.session.forgotOtpVerified;
        
        res.redirect('/login');
    } catch (error) {
        console.error("Reset Password Error:", error);
        res.send(error.message || "Server Error");
    }
};

const processLogout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Session Destruction Error:", err);
            return res.status(500).send("Failed to log out cleanly.");
        }
        res.redirect('/login');
    });
};

const loadHome = async (req, res) => {
    try {
        const paginationData = await authService.getHomepageProducts(req);
        res.render('user/home', {
            products: paginationData.results,        
            currentPage: paginationData.currentPage,   
            totalPages: paginationData.totalPages,
            layout: 'layout/user', 
            pageTitle: "Home - Dresson"      
        });
    } catch (error) {
        console.error("Home Page Error:", error);
        res.status(500).send("Server Error");
    }
};

const loadUsersDashboard = async (req, res) => {
    try {
        const paginationData = await authService.getPaginatedUsers(req);
        res.render('admin/usersList', {
            users: paginationData.results,        
            currentPage: paginationData.currentPage, 
            totalPages: paginationData.totalPages
        });
    } catch (error) {
        console.error("Pagination controller execution fault:", error);
        res.status(500).send("Failed to load paginated data array.");
    }
};

// Export ONLY the functions that exist in this file
export default { 
    loadSignUp,
    processSignUp, 
    loadOtpPage, 
    verifyOtp,
    loadLogin,
    processLogin,
    loadForgotPassword, 
    processForgotPassword,
    loadForgotOtpPage, 
    verifyForgotOtp,
    loadResetPassword,  
    processResetPassword,
    processLogout,
    loadHome, 
    loadUsersDashboard
};



// Exporting all functions
// export default { loadSignUp,
//                 processSignUp, 
//                 loadOtpPage, 
//                 loadLogin,
//                 processLogin,
//                 loadForgotPassword, 
//                 verifyForgotOtp,
//                 processForgotPassword, 
//                 loadForgotOtpPage, 
//                 loadResetPassword,  
//                 processResetPassword,
//                 verifyOtp, 
//                 processLogout,
//                 loadHome, 
//                 loadUsersDashboard,
//                 loadProfile,
//                 changeEmailRequest,
//                 changeEmailVerify,
//                 updatePassword,
//                 updateAvatar,
//                 changePassword 
//             };