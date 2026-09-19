import logger from '../../utilities/logger.js';
import * as authService from '../../services/user/authService.js';
import { SESSION_KEYS } from '../../constants/cookieConstants.js';
import * as userProductService from '../../services/user/userProductServices.js';


// For 'display' 'sign up' page
export const loadSignUp = async (req,res) => {
    if (req.session.user) return res.redirect('/');
    res.render('user/signup', {
        layout: 'layout/auth',
        pageTitle: "Sign up - Dresson"
    });
};


// For 'process' of 'user signup'
export const processSignUp = async (req, res) => {
    try {
        const registrationData = await authService.initiateUserRegistration(req.body);
        req.session.tempUser = registrationData.tempUser;
        req.session.otp = registrationData.otp;
        req.session.otpExpiry = registrationData.otpExpiry;
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


// For 'display' 'verify-otp' page, after 'sign up' process
export const loadOtpPage = (req, res) => {
    if (!req.session.tempUser) return res.redirect('/signup');
    res.render('user/verify-otp', {
        layout: 'layout/user',
        pageTitle: "Verify OTP - Dresson"
    });
};


// For 'process' of 'OTP' verification
export const verifyOtp = async (req, res) => {
    try {
        await authService.verifyAndRegisterUser(req.session, req.body.otp);
        delete req.session.tempUser;
        delete req.session.otp;
        delete req.session.otpExpiry;
        return res.status(200).json({
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


export const loadLogin = (req, res) => {
    if (req.session.user) return res.redirect('/');
    res.render('user/login', {
        error: null,
        layout: 'layout/auth',
        pageTitle: "Login - Dresson"
    });
};


export const processLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await authService.authenticateLocalUser(email, password);
        if (!user) {
            return res.render('login', { error: 'Invalid email or password' });
        }
        if (user.isBlocked === true || user.status === 'Blocked') {
            return res.render('user/login', {
                error: 'Your account has been blocked by the Administrator. Please contact support.',
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


export const processForgotPassword = async (req, res) => {
    try {
        const otp = await authService.initiatePasswordReset(req.body.email);
        req.session.forgotOtp = otp;
        req.session.forgotEmail = req.body.email;
        res.redirect('/forgot-otp');
    } catch (error) {
        logger.error("Forgot Password Error:", error);
        res.send(error.message || "Server Error");
    }
};


// For 'display' 'OTP' entering page for 'forgot password'
export const loadForgotOtpPage = async (req, res) => {
    try {
        if (!req.session.forgotEmail) return res.redirect('/forgot-password');
        res.render('user/verify-otp-forgotPas', {
            layout: 'layout/user',
            pageTitle: "Verify OTP - Dresson"
        });
    } catch (error) {
       logger.error("Error loading OTP page:", error);
        res.status(500).send("Server Error");
    }
};


// For 'OTP' verification for 'forgot password'
export const verifyForgotOtp = async (req, res) => {
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
        logger.error("Forgot OTP Verification Error:", error);
        res.status(500).send("Server Error");
    }
};


//  For 'display' new password page
export const loadResetPassword = async (req, res) => {
    try {
       if (!req.session.forgotEmail || !req.session.forgotOtpVerified) {
            return res.redirect('/forgot-password');
        }
        res.render('user/newPassword', {
            layout: 'layout/user',
            pageTitle: "Reset Password - Dresson"
        });
    } catch (error) {
        logger.error("Error loading reset password page:", error);
        res.status(500).send("Server Error");
    }
};


//  For 'process' of 'reset password'
export const processResetPassword = async (req, res) => {
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


//  For 'process' of 'logout'
export const processLogout = (req, res) => {
    if (req.session.user) {
        delete req.session.user;
    }
    if (req.session[SESSION_KEYS.USER_SESSION]) {
        delete req.session[SESSION_KEYS.USER_SESSION];
    }
    if (req.session.admin) {
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


// For 'display' 'user home' page
export const loadHome = async (req, res) => {
    try {
        const catalogData = await userProductService.compileShopCatalog(req.query);
        res.render('user/home', {
            ...catalogData,
            query: req.query,
            layout: 'layout/user',
            pageTitle: "Home - Dresson"
        });
    } catch (error) {
        logger.error("Home Page Error:", error);
        res.status(500).send("Server Error");
    }
};