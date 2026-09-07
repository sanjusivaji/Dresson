import bcrypt from 'bcrypt';
import crypto from 'crypto'; // <-- ADDED: Built-in Node module for generating random strings
import * as authRepository from '../../repository/user/authRepository.js';
import { sendOtpEmail } from '../../utilities/emailSender.js';
import paginate from '../../utilities/paginationHelper.js';
import Product from '../../model/productModel.js';
import { AUTH_REGEX, AUTH_CONFIG, AUTH_ROLES } from '../../constants/userAuthConstants.js';
import  normalizeEmail  from '../../utilities/emailHelper.js'; 
import logger from '../../utilities/logger.js'; 

const generateNumericOtp = () => Math.floor(100000 + Math.random() * 900000).toString();  // This function is only used here for generate 'random' nubers for 'OTP'.

// For 'generate' 'referal code' when user 'signup'
const generateReferralCode = (name) => {
    const prefix = name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'USR');         // First 3 letters of name
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();               // 6 random characters
    return `${prefix}${randomHex}`;
};

// For 'sign up' process
export const initiateUserRegistration = async (bodyData) => {
    const { name, email, password, confirmPassword, referralCode } = bodyData;
    const cleanName = name ? name.trim() : '';
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    if (!AUTH_REGEX.NAME.test(cleanName)) {                               // 'AUTH_REGEX' created in 'constants' folder for validation of 'name', 'email', 'password' etc
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
    const normEmail = normalizeEmail(cleanEmail);                  // Here 'normalizing' email in 'src/utilities/emailHelper.js'
    const existingUser = await authRepository.findUserByNormalizedEmail(normEmail);
    if (existingUser) {
        throw new Error("An account is already registered with this email address or an alias of it.");
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const otp = generateNumericOtp();                             // Already created just above.
    await sendOtpEmail(cleanEmail, otp);                          // This is the 'function' create in 'utilities/emailSender.js' file and used for send 'email'
    return {                                                      // Returns '3' values includes 'tempUser' object.
        tempUser: { 
            name: cleanName, 
            email: cleanEmail, 
            normalizedEmail: normEmail, 
            password: hashedPassword, 
            referralCode // Maintains the entered referral code across the session
        },
        otp,
        otpExpiry: Date.now() + AUTH_CONFIG.SIGNUP_OTP_EXPIRY_MS   // Value of 'expiry' time created in 'constants/userAuthConstants.js' folder
    };
};


// For 'register' user after 'inputting' the 'OTP'
export const verifyAndRegisterUser = async (sessionData, inputtedOtp) => {           // We call the function with 'req.session' and 'req.body.otp' as 'argument' from 'controller'.
    if (!sessionData.tempUser || !sessionData.otp) {                                 // Here checks 'session' 'tempUser' and 'otp' is 'available' or 'not'.
        throw new Error("Session expired. Please sign up again.");
    }
    if (Date.now() > sessionData.otpExpiry) {                                        // Checks 'OTP' time period expires or not
        throw new Error("OTP has expired. Please request a new one.");
    }
    if (inputtedOtp !== sessionData.otp) {                                           // Checks 'inputtedOtp'(ie passess as argument from user)and 'sessionData.otp'(ie 'otp' already stored in session)
        throw new Error("Invalid OTP. Please try again.");
    }
    const { name, email, normalizedEmail, password, referralCode } = sessionData.tempUser;  // Extracted referralCode inputted by the user (if any)    
    const nameParts = name.trim().split(/\s+/);                                      // It 'split()' the 'string' into 'array' based on 'space' and took 'only' first 'array' value(Eg, "Harry Potter" and it takes 'givenName: "Harry" ie avoids 'Potter')
    const givenName = nameParts[0];
    const familyName = nameParts.slice(1).join(' ') || '';
    const newReferralCode = generateReferralCode(givenName);                         // Function created above.
    let initialWalletBalance = 0;
    let walletTransactions = [];    
    if (referralCode) {
        const referrer = await authRepository.findUserByReferralCode(referralCode);  // For 'retrieve' 'first' matching 'document' in 'user' collection based on 'referral code'      
        if (referrer) {
            initialWalletBalance = AUTH_CONFIG.REFERRAL_REWARD_AMOUNT;               // Adding 'amount' based on 'REFERRAL_REWARD_AMOUNT'(ie created in 'constants' file)
            walletTransactions.push({
                amount: AUTH_CONFIG.REFERRAL_REWARD_AMOUNT,
                type: 'credit',
                description: 'Sign-up bonus from applying a referral code',
                date: new Date()
            });
            await authRepository.creditReferrerWallet(                               // For 'increase' 'user' 'wallet balance' in 'User' collection
                referrer._id, 
                AUTH_CONFIG.REFERRAL_REWARD_AMOUNT, 
                `Referral bonus for inviting ${givenName}`
            );
        } else {
             throw new Error("Invalid Referral Code.");
        }
    }
   // console.log(walletTransactions/n, walletBalance)
    await authRepository.createNewUser({                    // 'createNewUser()' is the function in 'repository/user/userAuthRepository.js' used for 'save' the data into 'data base' by using 'save()'.
        firstName: givenName,
        lastName: familyName,
        email: email,                                       // Saves: sajith+shopping@gmail.com (for sending emails)
        normalizedEmail: normalizedEmail,                   // Saves: sajith@gmail.com (for unique index DB blocking)
        password: password,            
        isVerified: true,
        role: AUTH_ROLES.USER,                              // From 'constants/userAuthConstants.js'
        isBlocked: false,
        referralCode: newReferralCode,                      // Their own unique code to share
        walletBalance: initialWalletBalance,                // Starts at 200 if referred, else 0
        walletHistory: walletTransactions                   // Stores the initial credit transaction
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

// For 'authenticate' is it 'user' or 'not'
export const authenticateLocalUser = async (email, password) => {
    try {
        const user = await authRepository.findUserByEmail(email);                        // Retrieve 'data' of 'user' based on 'email'.         
        if (!user) {
            logger.warn(`Auth failed: User not found for email: ${email}`);
            throw new Error("Invalid email or password.");
        }
        if (user.isBlocked) {
            logger.warn(`Auth failed: Blocked account login attempt for email: ${email}`);
            throw new Error("Your account has been blocked by the admin.");
        }
        if (!user.password) {                                                              // We already confirm 'user' is 'signed up' or not by '!user' and even after 'user' has 'no' password, then it 'signed up' by 'google'.
            logger.warn(`Auth failed: Google Sign-In expected for email: ${email}`);
            throw new Error("This account uses Google Sign-In. Please click 'Continue with Google' below."); 
        }
        const passwordMatch = await bcrypt.compare(password, user.password);               // Compare 'user given' and 'already stored' passwords inside 'bcrypt'     
        if (!passwordMatch) {
            logger.warn(`Auth failed: Incorrect password for email: ${email}`);
            throw new Error("Invalid email or password.");
        }
        authRepository.updateLastLogin(user._id).catch(err =>                             // For 'adding' 'lastLogin' field into 'user' collection   
            logger.error(`Failed to update last login for ${user._id}: ${err.message}`)
        );
        logger.info(`Authentication successful for user ID: ${user._id || email}`);
        return user;
    } catch (error) {
        logger.error(`Error in authenticateLocalUser for ${email}: ${error.message}`, { stack: error.stack });
        throw error;
    }
};


// For 'process' password reset
export const initiatePasswordReset = async (email) => {
    const user = await authRepository.findUserByEmail(email);       // Retrieve 'data' of 'user' based on 'email'.
    if (!user) throw new Error("Error: No account found with that email address.");
    const otp = generateNumericOtp();
    await sendOtpEmail(email, otp, 'reset');                        // Here 'reset' string create 'headerText'('Password Reset Request'),'body text','subject line' etc 
    return otp;
};

// For final 'updation' of the password
export const executeForgottenPasswordReset = async (sessionData, password, confirmPassword) => {
    if (!sessionData.forgotEmail || !sessionData.forgotOtpVerified) {    
        throw new Error("Unauthorized request session state.");
    }
    if (password !== confirmPassword) {
        throw new Error("Error: Passwords do not match.");
    }
    if (!AUTH_REGEX.PASSWORD.test(password)) {           // 'AUTH_REGEX' is created in 'constants' folder for 'validation' and 'test()' is the 'js' method especially for 'regex' and it used to test is 'password' 'matches' the rules of 'regex'
        throw new Error("Weak Password: Must be at least 8 characters and include uppercase, lowercase, number, and special character.");
    }
    const salt = await bcrypt.genSalt(10);               // Here 'bcrypt.genSalt(10)' used for create the 'salt' string(ie it is 22 character string created by complex mathematical algorithm ie the 'Blowfish cipher' 'looping' '10' times, and spits out a final string and finally adds with 'password' when use 'bcrypt.hash()'.
    const hashedPassword = await bcrypt.hash(password, salt);    
    const user = await authRepository.findUserByEmail(sessionData.forgotEmail); // For retrieve 'user' for his '_id' for updation.
    if (!user) throw new Error("Account context dropped.");    
    await authRepository.updateUserById(user._id, { password: hashedPassword }); // We passess 'id' and 'password' as key-vlaue pairs when call the 'updateUserById()' in 'repository.
};

// For 'display' the 'home' page
export const getHomepageProducts = async (req) => {
    return await paginate(Product, req, AUTH_CONFIG.HOME_PRODUCTS_LIMIT, { isDeleted: false }); // Here we call the 'paginate()' by 'Product'(ie 'model'),'req', 'constant value' and 'query' as 'arguments' and it 'return' all details of 'products' for each page.
};

