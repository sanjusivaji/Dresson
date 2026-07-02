import express from 'express';
import passport from '../config/passport.js';
import * as authController from '../controller/userController/authController.js';
import * as userProfileController from '../controller/userController/userProfileController.js'; 
import upload from '../config/multer.js';
import * as userAddressController from '../controller/userController/userAddressController.js';
import uploadCloud from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Route for 'display' signup and 'send' signed up data
router.route('/signup')
      .get(authController.loadSignUp)      
      .post(authController.processSignUp);

// Route for 'display' and 'verify' otp
router.route('/verify-otp')
      .get(authController.loadOtpPage)
      .post(authController.verifyOtp); 
      
// Route for 'display' and 'login' user
router.route('/login')
      .get(authController.loadLogin)
      .post(authController.processLogin);

// Route for display 'forgot password' page and send 'OTP'
router.route('/forgot-password')
      .get(authController.loadForgotPassword)
      .post(authController.processForgotPassword);

// Route for display 'OTP Page' and 'verify otp' 
router.route('/forgot-otp')
      .get(authController.loadForgotOtpPage) 
      .post(authController.verifyForgotOtp);  

// Route for 'logout'
router.get('/logout', authController.processLogout);

// Route for 'sign up' by 'google'
router.get('/auth/google', 
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Route for 'login' by 'Google' 
router.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/login', failureMessage: true }),
    (req, res) => {
        req.session.user = req.user._id;   // Save user ID in session
        res.redirect('/');            
    }
);

// Route for user 'homepage'
router.get('/', authController.loadHome);

// Route for display 'Set New Password' page and 'processing' of 'reset password' when 'forgot password' time and also in 'profile' page to 'change' the password
router.route('/reset-password')
      .get(authController.loadResetPassword)
      .post(authController.processResetPassword);


// Route for display 'profile' page
router.get('/profile', userProfileController.loadProfile);

// Route for change 'email' and 'name' in 'profile'
router.post('/profile/change-email-request', userProfileController.changeEmailRequest);
router.post('/profile/change-email-verify', userProfileController.changeEmailVerify);

// Route for 'change password' in profile
router.post('/profile/update-password', userProfileController.changePassword);

// Route for 'change profile image' in profile
// In your userRoute.js
// router.post('/profile/update-avatar', (req, res, next) => {
//     const upload = uploadCloud.single('profileImage');
    
//     upload(req, res, function (err) {
//         if (err) {
//             console.error("Multer/Cloudinary Error:", err);
//             // Force a JSON response even if the upload package crashes!
//             return res.status(400).json({ success: false, message: err.message || "Upload failed." });
//         }
//         // If no error, move on to your controller
//         next();
//     });
// }, userProfileController.updateAvatar);
router.post('/profile/update-avatar', uploadCloud.single('profileImage'), userProfileController.updateAvatar);
//router.post('/profile/update-avatar', uploadCloud.single('avatar'), userProfileController.updateAvatar);

// Route for 'display' the 'address' page of 'user'
router.get('/profile/address', userAddressController.loadAddressPage);

// Route for 'set default' the 'address' for 'Set Default' button
router.post('/profile/address/:id/set-default', userAddressController.setDefaultAddress);

// Route for 'diplay' the 'add address' page and its processing
router.route('/profile/address/add')
      .get(userAddressController.loadAddAddressPage)
      .post(userAddressController.processAddAddress);

// he Edit Address routes
router.route('/profile/address/edit/:id')
      .get(userAddressController.loadEditAddressPage)
      .post(userAddressController.processEditAddress);


router.post('/profile/address/delete/:id', userAddressController.deleteAddress);

export default router;