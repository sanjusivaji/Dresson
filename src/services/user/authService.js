import bcrypt from 'bcrypt';
import * as authRepository from '../../repository/user/authRepository.js';
import sendOtpEmail from '../../utilities/emailSender.js';
import paginate from '../../utilities/paginationHelper.js';
import Product from '../../model/productModel.js';
import { AUTH_REGEX, AUTH_CONFIG, AUTH_ROLES } from '../../constants/userAuthConstants.js';

const generateNumericOtp = () => Math.floor(100000 + Math.random() * 900000).toString();  // This function is only used here for generate 'random' nubers for 'OTP'.

// For 'sign up' process
export const initiateUserRegistration = async (bodyData) => {
    const { name, email, password, confirmPassword, referralCode } = bodyData;
    if (!AUTH_REGEX.NAME.test(name)) {                       // 'AUTH_REGEX' created 'constants' folder for validation of 'name', 'email', 'password' etc
        throw new Error("Invalid Name: Must be at least 3 characters and contain only letters.");
    }
    if (!AUTH_REGEX.EMAIL.test(email)) {
        throw new Error("Invalid Email format.");
    }
    if (!AUTH_REGEX.PASSWORD.test(password)) {
        throw new Error("Weak Password: Must be at least 8 characters and include uppercase, lowercase, number, and special character.");
    }
    if (password !== confirmPassword) {
        throw new Error("Passwords do not match!");
    }
    const existingUser = await authRepository.findUserByEmail(email);
    if (existingUser) {
        throw new Error("Email is already registered. Please log in.");
    }
    const otp = generateNumericOtp();                  // Already created just above.
    await sendOtpEmail(email, otp);                    // This is the 'function' create in 'utilities/emailSender.js' file and used for send 'email'
    return {                                           // Returns '3' values.
        tempUser: { name, email, password, referralCode },
        otp,
        otpExpiry: Date.now() + AUTH_CONFIG.SIGNUP_OTP_EXPIRY_MS    // Value of 'expiry' time created in 'constants/userAuthConstants.js' folder
    };
};

// For 'register' user after 'inputting' the 'OTP'
export const verifyAndRegisterUser = async (sessionData, inputtedOtp) => {  // We call the function with 'req.session' and 'req.body.otp' as 'argument' from 'controller'.
    if (!sessionData.tempUser || !sessionData.otp) {                        // Here checks 'session' 'tempUser' and 'otp' is 'available' or 'not'. 
        throw new Error("Session expired. Please sign up again.");
    }
    if (Date.now() > sessionData.otpExpiry) {                               // Checks 'OTP' time period expires or not
        throw new Error("OTP has expired. Please request a new one.");
    }
    if (inputtedOtp !== sessionData.otp) {                                 // Checks 'inputtedOtp'(ie passess as argument from user)and 'sessionData.otp'(ie 'otp' already stored in session)
        throw new Error("Invalid OTP. Please try again.");
    }
    const { name, email, password } = sessionData.tempUser;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const givenName = name.split(' ')[0];                           // It 'split()' the 'string' into 'array' based on 'space' and took 'only' first 'array' value(Eg, "Harry Potter" and it takes 'givenName: "Harry" ie avoids 'Potter')
    const familyName = name.split(' ').slice(1).join(' ') || '';    // It 'first' 'split' into array and then 'slice' from '1'(ie it avoids 'first' array)Eg, "Harry James Potter" output: "James Potter"
    await authRepository.createNewUser({                            // 'createNewUser()' is the function in 'repository/user/userAuthRepository.js' used for 'save' the data into 'data base' by using 'save()'.
        firstName: givenName,
        lastName: familyName,
        email: email,
        password: hashedPassword,
        isVerified: true,
        role: AUTH_ROLES.USER,                                        // From 'constants/userAuthConstants.js'
        isBlocked: false
    });
};

// For 'authenticate' is it 'user' or 'not'
export const authenticateLocalUser = async (email, password) => {
    const user = await authRepository.findUserByEmail(email);         // Retrieve 'data' of 'user' based on 'email'.
    if (!user) throw new Error("Invalid email or password.");
    if (user.isBlocked) throw new Error("Your account has been blocked by the admin.");
    if (!user.password) throw new Error("This account uses Google Sign-In. Please click 'Continue with Google' below."); // We already confirm 'user' is 'signed up' or not by '!user' and even after 'user' has 'no' password, then it 'signed up' by 'google'.
    const passwordMatch = await bcrypt.compare(password, user.password); // Compare 'user given' and 'already stored' passwords inside 'bcrypt'
    if (!passwordMatch) throw new Error("Invalid email or password.");
    return user;
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

