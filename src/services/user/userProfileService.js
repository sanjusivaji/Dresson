import bcrypt from 'bcrypt';
import * as profileRepository from '../../repository/user/userProfileRepository.js';
import {sendOtpEmail} from '../../utilities/emailSender.js';
import { PROFILE_CONFIG, PROFILE_REGEX } from '../../constants/userProfileConstants.js';
import { extractCloudinaryId } from '../../utilities/cloudinaryExtract.js';
import { v2 as cloudinary } from 'cloudinary';


const generateNumericOtp = () => Math.floor(100000 + Math.random() * 900000).toString();  // This function uses inside the file

// For go to 'user profile' 
export const prepareProfileData = async (userId) => {
    const user = await profileRepository.findUserById(userId); // It 'retrieve' 'user' detail based on 'userId'
    if (!user) throw new Error("User validation dropped.");
    return user;
};


// For generate 'OTP' and send it to email
export const requestProfileEmailUpdate = async (userId, sessionData, bodyData) => {
    const { newName, newEmail, password } = bodyData;
    const user = await profileRepository.findUserById(userId);
    if (!user) throw new Error("Authentication validation failed. User not found.");    
    if (!user.password && !sessionData.googleReAuthVerified) {
        return {needsGoogleReAuth: true};                    // Here we just 'create' and 'return' an 'object'(ie '{needsGoogleReAuth: true}')only if 'user' has 'no' password and 'not' 'loged in' by 'google' and the return object '{needsGoogleReAuth: true}' used for display in front end 'User can login through google'
    }
    if (!newName || newName.trim().length < 3) {             // Ensure inputting value 'newName' and it has at least '3' characters
        throw new Error("Please provide a valid full name (minimum 3 characters).");
    }
    if (user.password) {                                    // It is for 'normally' logged in email(ie they have 'password' and here we check the password is match)
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) throw new Error("Incorrect current password validation.");
    }
    if (newEmail !== user.email) {                          // It checks 'current email' and 'new email' are same and if it is 'not' then checks if the 'new email' already 'signed up' or not.
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

// For 'update' new name and email
export const commitProfileEmailUpdate = async (userId, sessionData, inputtedOtp) => {
    if (!sessionData.updateEmailOtp || !sessionData.updateEmailTemp || !sessionData.updateNameTemp) {  // Checks data still in 'session'
        throw new Error("Transaction data cleared. Please restart profile update.");
    }
    if (Date.now() > sessionData.updateEmailOtpExpiry) {                                              // Checks 'email' expired or not
        throw new Error("OTP has expired. Please request a new verification token.");
    }
    if (inputtedOtp !== sessionData.updateEmailOtp) {                                                 // Compare inputted otp with already stored otp in 'session'
        throw new Error("Invalid verification code. Please check and try again.");
    }
    const nameParts = sessionData.updateNameTemp.split(' ');                                         // Here 'splitting' the 'new name'(ie 'updateNameTemp') and then in below we take 'first name'(ie 'nameParts[0]) and then 'slicing' first name and take only 'second name' as 'lastName'.
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';
    await profileRepository.updateUserById(userId, {                                                 // Finally we update the 'first' and 'last' name with new email.
        firstName, 
        lastName,
        email: sessionData.updateEmailTemp
    });
};

// For 'password' change in 'user profile' page
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
    await profileRepository.updateUserById(userId, { password: hashedPassword });   // Updating new password into database.
    return user;
};

// For 'update' profile picture of 'user'
export const executeAvatarUpdate = async (userId, cloudinaryUrl) => {
    await profileRepository.updateUserById(userId, { profileImage: cloudinaryUrl }); //  Here 'cloudinaryUrl' is the 'url' of 'uloaded' image in 'cloudinary' and we updating /adding value of 'profileImage' field as 'cloudinaryUrl', and also 'return' this 'url', so we can retrieve this link display image in forntend.    
    return cloudinaryUrl;                                                            //  Here we 'return' url that actually what we pass as argument, because 'controller.js' recieve data that get from 'service'(ie also from 'repository'), so we keep that flow.  
};



export const processProfileImageUpdate = async (userId, newImagePath) => {
    const user = await userRepository.findUserById(userId);
    if (!user) {
        throw new Error("User not found");
    }
    if (user.profileImage) {
        const publicId = extractCloudinaryId.extractCloudinaryId(user.profileImage);             // Retrieving 'extractCloudinaryId' from 'src/utilities/cloudinaryExtracts.js' file and 'checking' the is this 'profile image' of 'user' and if it is 'true', 'delete' the old image from Cloudinary
        if (publicId) {
            await cloudinary.uploader.destroy(publicId);
        }
    }
    return await profileRepository.updateProfileImage(userId, newImagePath);   // Save the new image path to the database
};