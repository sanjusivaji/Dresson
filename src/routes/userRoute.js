import express from 'express';
import passport from '../config/passport.js';
import * as authController from '../controller/userController/authController.js';
import * as userProfileController from '../controller/userController/userProfileController.js'; 
import * as userAddressController from '../controller/userController/userAddressController.js';
import uploadCloud from '../middleware/uploadMiddleware.js';
import { requireActiveUser } from '../middleware/userAuth.js';
import * as productController from '../controller/userController/productController.js';
import * as cartController from '../controller/userController/cartController.js';
import * as wishlistController from '../controller/userController/wishlistController.js';
import * as checkoutController from '../controller/userController/checkoutController.js';


const router = express.Router();


// Route for 'display' signup and 'send' signed up data and 'display' 'otp' page
router.route('/signup')
      .get(authController.loadSignUp)      
      .post(authController.processSignUp);

// Route for and 'verify' otp
router.route('/verify-otp')
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

// Route for user 'home' page
router.get('/shop', productController.getShopPage);
router.get('/', productController.getShopPage);

router.get('/product/:id', productController.getProductDetails);


//  Route for 'middleware' to check user is 'blocked' or not by 'admin'
router.use('/profile', requireActiveUser);

// Route for display 'profile' page
router.get('/profile', userProfileController.loadProfile);

// Route for change 'email' and 'name' in 'profile'
router.post('/profile/change-email-request', userProfileController.changeEmailRequest);
router.post('/profile/change-email-verify', userProfileController.changeEmailVerify);

// Route for 'change password' in profile
router.post('/profile/update-password', userProfileController.changePassword);

// Route for 'change profile image' in profile by using 'uploadCloud' middleware
router.post('/profile/update-avatar', uploadCloud.single('profileImage'), userProfileController.updateAvatar);

// Route for 'display' the 'address' page of 'user'
router.get('/profile/address', userAddressController.loadAddressPage);

// Route for 'set default' the 'address' for 'Set Default' button
router.post('/profile/address/:id/set-default', userAddressController.setDefaultAddress);

// Route for 'diplay' the 'add address' page and its processing
router.route('/profile/address/add')
      .get(userAddressController.loadAddAddressPage)
      .post(userAddressController.processAddAddress);

// Route for 'Edit address'
router.route('/profile/address/edit/:id')
      .get(userAddressController.loadEditAddressPage)
      .post(userAddressController.processEditAddress);

// Route for 'delete' address
router.post('/profile/address/delete/:id', userAddressController.deleteAddress);

// Route for 'cart' operations
router.get('/cart', requireActiveUser, cartController.getCartPage);
router.post('/cart/add', requireActiveUser, cartController.postAddToCart);
router.patch('/cart/update-quantity', requireActiveUser, cartController.patchUpdateQuantity);
router.delete('/cart/remove/:itemId', requireActiveUser, cartController.deleteRemoveItem);

// Route for display 'wishlist' 
router.get('/wishlist', requireActiveUser, wishlistController.getWishlistPage);

// Route for 'wishlist' toggle
router.post('/wishlist/toggle', requireActiveUser, wishlistController.toggleWishlistItem);

// Route for 'checkout' page
router.get('/checkout', requireActiveUser, checkoutController.getCheckoutPage);

// This will handle the final "Place Order" button on the checkout page
router.post('/checkout/place-order', requireActiveUser, checkoutController.placeOrder);

export default router;