import bcrypt from 'bcrypt';
import * as authRepository from '../../repository/user/authRepository.js';
import sendOtpEmail from '../../utilities/emailSender.js';
import paginate from '../../utilities/paginationHelper.js';
import Product from '../../model/productModel.js';
import User from '../../model/userModel.js';
import { AUTH_REGEX, AUTH_CONFIG, AUTH_ROLES } from '../../constants/userAuthConstants.js';

const generateNumericOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

export const initiateUserRegistration = async (bodyData) => {
    const { name, email, password, confirmPassword, referralCode } = bodyData;

    if (!AUTH_REGEX.NAME.test(name)) {
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

    const otp = generateNumericOtp();
    await sendOtpEmail(email, otp);

    return {
        tempUser: { name, email, password, referralCode },
        otp,
        otpExpiry: Date.now() + AUTH_CONFIG.SIGNUP_OTP_EXPIRY_MS
    };
};

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

    const { name, email, password } = sessionData.tempUser;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const givenName = name.split(' ')[0];
    const familyName = name.split(' ').slice(1).join(' ') || '';

    await authRepository.createNewUser({
        firstName: givenName,
        lastName: familyName,
        email: email,
        password: hashedPassword,
        isVerified: true,
        role: AUTH_ROLES.USER,
        isBlocked: false
    });
};

export const authenticateLocalUser = async (email, password) => {
    const user = await authRepository.findUserByEmail(email);
    if (!user) throw new Error("Invalid email or password.");
    if (user.isBlocked) throw new Error("Your account has been blocked by the admin.");
    if (!user.password) throw new Error("This account uses Google Sign-In. Please click 'Continue with Google' below.");

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) throw new Error("Invalid email or password.");

    return user;
};

export const initiatePasswordReset = async (email) => {
    const user = await authRepository.findUserByEmail(email);
    if (!user) throw new Error("Error: No account found with that email address.");

    const otp = generateNumericOtp();
    await sendOtpEmail(email, otp, 'reset');
    return otp;
};

export const getHomepageProducts = async (req) => {
    return await paginate(Product, req, AUTH_CONFIG.HOME_PRODUCTS_LIMIT, { isDeleted: false });
};

export const getPaginatedUsers = async (req) => {
    return await paginate(User, req, AUTH_CONFIG.ADMIN_USERS_LIMIT, { role: "user" });
};

export const prepareProfileData = async (userId) => {
    const user = await authRepository.findUserById(userId);
    if (!user) throw new Error("User validation dropped.");
    return user;
};

export const requestProfileEmailUpdate = async (userId, sessionData, bodyData) => {
    const { newName, newEmail, password } = bodyData;
    const user = await authRepository.findUserById(userId);

    if (!user) throw new Error("Authentication validation failed. User not found.");
    
    if (!user.password && !sessionData.googleReAuthVerified) {
        return { needsGoogleReAuth: true };
    }

    if (!newName || newName.trim().length < 3) {
        throw new Error("Please provide a valid full name (minimum 3 characters).");
    }

    if (user.password) {
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) throw new Error("Incorrect current password validation.");
    }

    if (newEmail !== user.email) {
        const emailTaken = await authRepository.findUserByEmail(newEmail);
        if (emailTaken) throw new Error("This email address is already claimed by another account.");
    }

    const otp = generateNumericOtp();
    await sendOtpEmail(newEmail, otp, 'reset');

    return {
        success: true,
        updateNameTemp: newName.trim(),
        updateEmailTemp: newEmail.trim(),
        updateEmailOtp: otp,
        updateEmailOtpExpiry: Date.now() + AUTH_CONFIG.PROFILE_EMAIL_OTP_EXPIRY_MS
    };
};

export const commitProfileEmailUpdate = async (userId, sessionData, inputtedOtp) => {
    if (!sessionData.updateEmailOtp || !sessionData.updateEmailTemp || !sessionData.updateNameTemp) {
        throw new Error("Transaction data cleared. Please restart profile update.");
    }
    if (Date.now() > sessionData.updateEmailOtpExpiry) {
        throw new Error("OTP has expired. Please request a new verification token.");
    }
    if (inputtedOtp !== sessionData.updateEmailOtp) {
        throw new Error("Invalid verification code. Please check and try again.");
    }

    const nameParts = sessionData.updateNameTemp.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    await authRepository.updateUserById(userId, {
        firstName,
        lastName,
        email: sessionData.updateEmailTemp
    });
};

export const executeProfilePasswordChange = async (userId, bodyData) => {
    const { currentPassword, newPassword, confirmNewPassword } = bodyData;
    const user = await authRepository.findUserById(userId);

    if (!user) throw new Error("User validation dropped.");
    if (newPassword !== confirmNewPassword) throw new Error("Passwords do not match!");
    if (!AUTH_REGEX.PASSWORD.test(newPassword)) {
        throw new Error("Weak Password: Must be at least 8 characters and include uppercase, lowercase, a number, and a special character.");
    }

    if (user.password) {
        const passwordMatch = await bcrypt.compare(currentPassword, user.password);
        if (!passwordMatch) throw new Error("Incorrect current password validation.");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    await authRepository.updateUserById(userId, { password: hashedPassword });
    return user;
};

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

export const executeAvatarUpdate = async (userId, filename) => {
    const userUploadedUrl = `/uploads/profile/${filename}`;
    await authRepository.updateUserById(userId, { profileImage: userUploadedUrl });
    return userUploadedUrl;
};