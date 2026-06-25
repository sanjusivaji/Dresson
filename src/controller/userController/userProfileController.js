import logger from '../../utilities/logger.js';
import * as userProfileService from '../../services/user/userProfileService.js';

export const loadProfile = async (req, res) => {
    try {
        if (!req.session.user) return res.redirect('/login');
        const user = await userProfileService.prepareProfileData(req.session.user);
        
        res.render('user/profile', { 
            user, 
            error: null, 
            success: null,
            layout: 'layout/user', 
            pageTitle: "My Profile - Dresson",
            activeSidebar: 'account' 
        });
    } catch (error) {
        console.error("Profile view rendering exception:", error);
        res.redirect('/login');
    }
};

export const changeEmailRequest = async (req, res) => {
    try {
        const result = await userProfileService.requestProfileEmailUpdate(req.session.user, req.session, req.body);
        
        if (result.needsGoogleReAuth) {
            return res.json({ 
                success: false, 
                needsGoogleReAuth: true, 
                message: "For security, please re-authenticate your Google account first." 
            });
        }

        req.session.updateNameTemp = result.updateNameTemp;            
        req.session.updateEmailTemp = result.updateEmailTemp;
        req.session.updateEmailOtp = result.updateEmailOtp;
        req.session.updateEmailOtpExpiry = result.updateEmailOtpExpiry;

        res.json({ success: true });
    } catch (error) {
        logger.error("Change profile info request failure:", error);
        res.json({ success: false, message: error.message || "Server configuration failure." });
    }
};

export const changeEmailVerify = async (req, res) => {
    try {
        await userProfileService.commitProfileEmailUpdate(req.session.user, req.session, req.body.otp);
        
        delete req.session.updateNameTemp;                    
        delete req.session.updateEmailTemp;
        delete req.session.updateEmailOtp;
        delete req.session.updateEmailOtpExpiry;
        
        res.json({ success: true });
    } catch (error) {
        console.error("Profile rewrite save execution failed:", error);
        res.json({ success: false, message: error.message || "Core database write engine exception trace error." });
    }
};

export const changePassword = async (req, res) => {
    try {
        const user = await userProfileService.executeProfilePasswordChange(req.session.user, req.body);
        
        return res.render('user/profile', { 
            user, 
            error: null, 
            success: "Password changed successfully!",
            layout: 'layout/user',
            pageTitle: "My Profile - Dresson"
        });
    } catch (error) {
        console.error("Change password profile update fail:", error);
        try {
            const user = await userProfileService.prepareProfileData(req.session.user);
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

export const updateAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.json({ success: false, message: "No image file provided." });
        }

        const cloudImageUrl = req.file.path; 

        const imageUrl = await userProfileService.executeAvatarUpdate(req.session.user, cloudImageUrl);
        
        res.json({ success: true, imageUrl });
    } catch (error) {
        logger.error("Avatar update failure:", error);
        res.json({ success: false, message: "Server asset storage system fault." });
    }
};

