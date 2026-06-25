import bcrypt from 'bcrypt';
import * as profileRepository from '../../repository/user/userProfileRepository.js';
import sendOtpEmail from '../../utilities/emailSender.js';
import { PROFILE_CONFIG, PROFILE_REGEX } from '../../constants/userProfileConstants.js';

const generateNumericOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

export const prepareProfileData = async (userId) => {
    const user = await profileRepository.findUserById(userId);
    if (!user) throw new Error("User validation dropped.");
    return user;
};

export const requestProfileEmailUpdate = async (userId, sessionData, bodyData) => {
    const { newName, newEmail, password } = bodyData;
    const user = await profileRepository.findUserById(userId);

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
        const emailTaken = await profileRepository.findUserByEmail(newEmail);
        if (emailTaken) throw new Error("This email address is already claimed by another account.");
    }

    const otp = generateNumericOtp();
    await sendOtpEmail(newEmail, otp, 'reset');

    return {
        success: true,
        updateNameTemp: newName.trim(),
        updateEmailTemp: newEmail.trim(),
        updateEmailOtp: otp,
        updateEmailOtpExpiry: Date.now() + PROFILE_CONFIG.EMAIL_OTP_EXPIRY_MS
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

    await profileRepository.updateUserById(userId, {
        firstName,
        lastName,
        email: sessionData.updateEmailTemp
    });
};

export const executeProfilePasswordChange = async (userId, bodyData) => {
    const { currentPassword, newPassword, confirmNewPassword } = bodyData;
    const user = await profileRepository.findUserById(userId);

    if (!user) throw new Error("User validation dropped.");
    if (newPassword !== confirmNewPassword) throw new Error("Passwords do not match!");
    if (!PROFILE_REGEX.PASSWORD.test(newPassword)) {
        throw new Error("Weak Password: Must be at least 8 characters and include uppercase, lowercase, a number, and a special character.");
    }

    if (user.password) {
        const passwordMatch = await bcrypt.compare(currentPassword, user.password);
        if (!passwordMatch) throw new Error("Incorrect current password validation.");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    await profileRepository.updateUserById(userId, { password: hashedPassword });
    return user;
};

export const executeAvatarUpdate = async (userId, filename) => {
    const userUploadedUrl = `/uploads/profile/${filename}`;
    await profileRepository.updateUserById(userId, { profileImage: userUploadedUrl });
    return userUploadedUrl;
};