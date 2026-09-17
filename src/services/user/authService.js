import bcrypt from 'bcrypt';
import crypto from 'crypto';
import * as authRepository from '../../repository/user/authRepository.js';
import { sendOtpEmail } from '../../utilities/emailSender.js';
import paginate from '../../utilities/paginationHelper.js';
import Product from '../../model/productModel.js';
import { AUTH_REGEX, AUTH_CONFIG, AUTH_ROLES } from '../../constants/userAuthConstants.js';
import normalizeEmail from '../../utilities/emailHelper.js'; 
import logger from '../../utilities/logger.js'; 


const generateNumericOtp = () => Math.floor(100000 + Math.random() * 900000).toString();


// Generates a unique referral code when a user signs up using their name
const generateReferralCode = (name) => {
    const prefix = name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'USR');
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `${prefix}${randomHex}`;
};


// Starts the sign up process by checking the typed info and sending an OTP email
export const initiateUserRegistration = async (bodyData) => {
    const { name, email, password, confirmPassword, referralCode } = bodyData;
    const cleanName = name ? name.trim() : '';
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    if (!AUTH_REGEX.NAME.test(cleanName)) {
        throw new Error("Invalid Name: Must be at least 3 characters and contain only letters.");
    }
    if (!AUTH_REGEX.EMAIL.test(cleanEmail)) {
        throw new Error("Invalid Email format.");
    }
    if (!AUTH_REGEX.PASSWORD.test(password)) {
        throw new Error("Weak Password: Must be at least 8 characters and include uppercase, lowercase, number, and special character.");
    }
    if (password !== confirmPassword) {
        throw new Error("Passwords do not match!");
    }
    const normEmail = normalizeEmail(cleanEmail);
    const existingUser = await authRepository.findUserByNormalizedEmail(normEmail);
    if (existingUser) {
        throw new Error("An account is already registered with this email address or an alias of it.");
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const otp = generateNumericOtp();
    await sendOtpEmail(cleanEmail, otp);
    return {
        tempUser: { 
            name: cleanName, 
            email: cleanEmail, 
            normalizedEmail: normEmail, 
            password: hashedPassword, 
            referralCode 
        },
        otp,
        otpExpiry: Date.now() + AUTH_CONFIG.SIGNUP_OTP_EXPIRY_MS
    };
};


// Officially registers the user into the database if they type the correct OTP
export const verifyAndRegisterUser = async (sessionData, inputtedOtp) => {
    if (!sessionData.tempUser || !sessionData.otp) {
        throw new Error("Session expired. Please sign up again.");
    }
    if (Date.now() > sessionData.otpExpiry) {
        throw new Error("OTP has expired. Please request a new one.");
    }
    if (inputtedOtp !== sessionData.otp) {
        throw new Error("Invalid OTP. Please try again.");
    }
    const { name, email, normalizedEmail, password, referralCode } = sessionData.tempUser;      
    const nameParts = name.trim().split(/\s+/);
    const givenName = nameParts[0];
    const familyName = nameParts.slice(1).join(' ') || '';
    const newReferralCode = generateReferralCode(givenName);
    let initialWalletBalance = 0;
    let walletTransactions = [];    
    if (referralCode) {
        const referrer = await authRepository.findUserByReferralCode(referralCode);
        if (referrer) {
            initialWalletBalance = AUTH_CONFIG.REFERRAL_REWARD_AMOUNT;
            walletTransactions.push({
                amount: AUTH_CONFIG.REFERRAL_REWARD_AMOUNT,
                type: 'credit',
                description: 'Sign-up bonus from applying a referral code',
                date: new Date()
            });
            await authRepository.creditReferrerWallet(
                referrer._id, 
                AUTH_CONFIG.REFERRAL_REWARD_AMOUNT, 
                `Referral bonus for inviting ${givenName}`
            );
        } else {
             throw new Error("Invalid Referral Code.");
        }
    }
    await authRepository.createNewUser({
        firstName: givenName,
        lastName: familyName,
        email: email,
        normalizedEmail: normalizedEmail,
        password: password,            
        isVerified: true,
        role: AUTH_ROLES.USER,                              
        isBlocked: false,
        referralCode: newReferralCode,                      
        walletBalance: initialWalletBalance,                
        walletHistory: walletTransactions                   
    });
    const savedUser = await authRepository.findUserByNormalizedEmail(normalizedEmail);
    if (initialWalletBalance > 0 && savedUser) {
        await authRepository.creditNewUserWalletTransaction(
            savedUser._id,
            initialWalletBalance,
            'Sign-up bonus from applying a referral code'
        );
    }
};


// Logs the user in by checking their email and password
export const authenticateLocalUser = async (email, password) => {
    try {
        const user = await authRepository.findUserByEmail(email);
        if (!user) {
            logger.warn(`Auth failed: User not found for email: ${email}`);
            throw new Error("Invalid email or password.");
        }
        if (user.isBlocked) {
            logger.warn(`Auth failed: Blocked account login attempt for email: ${email}`);
            throw new Error("Your account has been blocked by the admin.");
        }
        if (!user.password) {
            logger.warn(`Auth failed: Google Sign-In expected for email: ${email}`);
            throw new Error("This account uses Google Sign-In. Please click 'Continue with Google' below."); 
        }
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            logger.warn(`Auth failed: Incorrect password for email: ${email}`);
            throw new Error("Invalid email or password.");
        }
        authRepository.updateLastLogin(user._id).catch(err =>
            logger.error(`Failed to update last login for ${user._id}: ${err.message}`)
        );
        logger.info(`Authentication successful for user ID: ${user._id || email}`);
        return user;
    } catch (error) {
        logger.error(`Error in authenticateLocalUser for ${email}: ${error.message}`, { stack: error.stack });
        throw error;
    }
};


// Starts the forgotten password process by sending an OTP
export const initiatePasswordReset = async (email) => {
    const user = await authRepository.findUserByEmail(email);
    if (!user) throw new Error("Error: No account found with that email address.");
    const otp = generateNumericOtp();
    await sendOtpEmail(email, otp, 'reset');
    return otp;
};


// Saves the user's new password after they forgot the old one
export const executeForgottenPasswordReset = async (sessionData, password, confirmPassword) => {
    if (!sessionData.forgotEmail || !sessionData.forgotOtpVerified) {    
        throw new Error("Unauthorized request session state.");
    }
    if (password !== confirmPassword) {
        throw new Error("Error: Passwords do not match.");
    }
    if (!AUTH_REGEX.PASSWORD.test(password)) {
        throw new Error("Weak Password: Must be at least 8 characters and include uppercase, lowercase, number, and special character.");
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);    
    const user = await authRepository.findUserByEmail(sessionData.forgotEmail);
    if (!user) throw new Error("Account context dropped.");    
    await authRepository.updateUserById(user._id, { password: hashedPassword });
};


// Gets the products to show on the main home page
export const getHomepageProducts = async (req) => {
    return await paginate(Product, req, AUTH_CONFIG.HOME_PRODUCTS_LIMIT, { isDeleted: false });
};