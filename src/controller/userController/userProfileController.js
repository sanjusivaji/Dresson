import logger from '../../utilities/logger.js';
import * as userProfileService from '../../services/user/userProfileService.js';
import { v2 as cloudinary } from 'cloudinary';
import * as userService from '../../services/user/userProfileService.js';

// For 'display' user profile (when route '/profile')
export const loadProfile = async (req, res) => {
    try {
        if (!req.session.user) return res.redirect('/login');
        const user = await userProfileService.prepareProfileData(req.session.user); // Retrieve all data of 'user'       
        res.render('user/profile', { 
            user, 
            error: null, 
            success: null,                                                         // It prevent 'ejs' crash 
            layout: 'layout/user', 
            pageTitle: "My Profile - Dresson",
            activeSidebar: 'account' 
        });
    } catch (error) {
        logger.error("Profile view rendering exception:", error);
        res.redirect('/login');
    }
};

// For 'change' the 'email' or 'name' in 'user profile' page
export const changeEmailRequest = async (req, res) => {
    try {
        const result = await userProfileService.requestProfileEmailUpdate(req.session.user, req.session, req.body); // Function used for check new email and password are valid and then it generate and send 'otp' to new email.       
        if (result.needsGoogleReAuth) {                                                                             // We return '{needsGoogleReAuth: true}' when user has 'no' password case and it is for display below message in front end.
            return res.json({ 
                success: false, 
                needsGoogleReAuth: true, 
                message: "For security, please re-authenticate your Google account first." 
            });
        }
        req.session.updateNameTemp = result.updateNameTemp;                           // Store data for future operation       
        req.session.updateEmailTemp = result.updateEmailTemp;
        req.session.updateEmailOtp = result.updateEmailOtp;
        req.session.updateEmailOtpExpiry = result.updateEmailOtpExpiry;
        res.json({ success: true });                                                 // It is for 'front end' for inform '{ success: true }'
    } catch (error) {
        logger.error("Change profile info request failure:", error);
        res.json({ success: false, message: error.message || "Server configuration failure." });
    }
};

// For processing the 'email' change
export const changeEmailVerify = async (req, res) => {
    try {
        await userProfileService.commitProfileEmailUpdate(req.session.user, req.session, req.body.otp); // This function checks 'session','email', 'otp' etc expires or not and then split into 'first' and 'last' name and finally we 'update' it with 'new email' in 'data base'.        
        delete req.session.updateNameTemp;                                                              // After updation we 'delete' all data from 'session'          
        delete req.session.updateEmailTemp;
        delete req.session.updateEmailOtp;
        delete req.session.updateEmailOtpExpiry;        
        res.json({ success: true });                                                                   // For inform 'front end'
    } catch (error) {
        logger.error("Profile rewrite save execution failed:", error);
        res.json({ success: false, message: error.message || "Core database write engine exception trace error." });
    }
};

// For change password in 'user profile' page
export const changePassword = async (req, res) => {
    try {
        const user = await userProfileService.executeProfilePasswordChange(req.session.user, req.body);  // For updating password      
        return res.render('user/profile', {                                                             
            user, 
            error: null, 
            success: "Password changed successfully!",
            layout: 'layout/user',
            pageTitle: "My Profile - Dresson"
        });
    } catch (error) {
        logger.error("Change password profile update fail:", error);
        try {
            const user = await userProfileService.prepareProfileData(req.session.user);                 // For go to 'user profile'
            return res.render('user/profile', { 
                user, 
                error: error.message || "Internal error", 
                success: null,
                layout: 'layout/user',
                pageTitle: "My Profile - Dresson"
            });
        } catch {
            res.status(500).send("Internal Application Error");
        }
    }
};

// For 'update' 'profile picture' of user
export const updateAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.json({ success: false, message: "No image file provided." });
        }
        const cloudinaryUrl = req.file.secure_url;
        const imageUrl = await userProfileService.executeAvatarUpdate(req.session.user, cloudinaryUrl);   // It just 'update' the 'cloudinaryUrl' as value of 'profileImage' and 'return' the 'same' value for keep the flow.     
        res.json({ success: true, imageUrl });
    } catch (error) {
        console.error("Avatar update failure:", error);
        res.json({ success: false, message: "Server storage error." });
    }
};



export const updateProfileImage = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const newImagePath = req.file.path;
        await userService.processProfileImageUpdate(userId, newImagePath);
        res.redirect('/profile');

    } catch (error) {
        console.error("Profile image update failed:", error);
        res.status(500).send("Error updating profile");
    }
};



