import express from 'express';
import passport from '../config/passport.js';
import authController from '../controller/userController/authController.js';
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

// Route for 'forgot password' page and send 'OTP'
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

// Route for display "Set New Password" page in 'profile' also 'change' the password
router.route('/reset-password')
      .get(authController.loadResetPassword)
      .post(authController.processResetPassword);


// Route for display 'profile' page
router.get('/profile', userProfileController.loadProfile);

// Route for change 'email' and 'name' in 'profile'
router.post('/profile/change-email-request', userProfileController.changeEmailRequest);
router.post('/profile/change-email-verify', userProfileController.changeEmailVerify);

// For 'change password' in profile
router.post('/profile/update-password', userProfileController.changePassword);

// Route for 'change profile image' in profile
router.post('/profile/update-avatar', uploadCloud.single('avatar'), userProfileController.updateAvatar);
// router.post('/profile/update-avatar', upload.single('profileImage'), userProfileController.updateAvatar);


router.get('/profile/address', userAddressController.loadAddressPage);

//  The Add Address routes (THIS IS WHAT YOU ARE MISSING!)
router.route('/profile/address/add')
      .get(userAddressController.loadAddAddressPage)
      .post(userAddressController.processAddAddress);

// he Edit Address routes
router.route('/profile/address/edit/:id')
      .get(userAddressController.loadEditAddressPage)
      .post(userAddressController.processEditAddress);

// Default and Delete actions
//router.post('/profile/address/default/:id', userAddressController.setDefaultAddress);
router.post('/profile/address/:id/set-default', userAddressController.setDefaultAddress);



router.post('/profile/address/delete/:id', userAddressController.deleteAddress);

export default router;