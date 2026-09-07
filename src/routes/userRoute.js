import express from 'express';
import passport from '../config/passport.js';                                                    // For 'login' by 'Google'
import * as authController from '../controller/userController/authController.js';
import * as userProfileController from '../controller/userController/userProfileController.js'; 
import * as userAddressController from '../controller/userController/userAddressController.js';
import uploadCloud from '../middleware/uploadMiddleware.js';                                     // For 'upload' the 'dresson_user_avatar'(ie 'image' of profile) folder in 'cloudinary'
import { uploadReview } from '../middleware/uploadMiddleware.js';                                // For 'upload' the 'dresson_user_avatar'(ie image of 'review' photo by user) folder in 'cloudinary'
import { requireActiveUser } from '../middleware/userAuth.js';
import * as productController from '../controller/userController/productController.js';
import * as cartController from '../controller/userController/cartController.js';
import * as wishlistController from '../controller/userController/wishlistController.js';
import * as checkoutController from '../controller/userController/checkoutController.js';
import * as orderController from '../controller/userController/userOrderController.js'
import * as walletController from '../controller/userController/walletController.js';






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
    passport.authenticate('google', { scope: ['profile', 'email'] })       // 'scope' data send 'google' for 'inform' what data need from 'google' to 'application'
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

// Route for 'wallet'
router.get('/profile/wallet', requireActiveUser, walletController.getWalletPage);


router.post('/profile/orders/item-action', requireActiveUser, orderController.processItemAction)


// Route for 'display' 'order success'
router.get('/order-success',requireActiveUser, checkoutController.getOrderSuccessPage);

// Route for 'verify payment'
router.post('/checkout/verify-payment', requireActiveUser, checkoutController.verifyPayment);

// Route for 'display' orders
router.get('/profile/orders', requireActiveUser, orderController.getUserOrdersPage);


// Router chaining for 'display' 'return' orders page and 'return process', only after 'delivered'
router.route('/profile/orders/:id/return')
      .get( requireActiveUser, orderController.getReturnDetailsPage)
      .post(requireActiveUser, orderController.processReturnRequest );



router.post('/profile/orders/item-action', requireActiveUser, orderController.processItemAction);

// Route for 'orders' in user side
router.get('/profile/orders/:id', requireActiveUser, orderController.getOrderDetailsPage);

// Route for 'cancel order' in user side
router.post('/profile/orders/:id/cancel', requireActiveUser, orderController.cancelOrder);

// Route for 'display' and 'download' invoice
router.get('/profile/orders/:id/invoice', requireActiveUser, orderController.downloadInvoice);


// Route for 'cart' operations
router.get('/cart', requireActiveUser, cartController.getCartPage);
router.post('/cart/add', requireActiveUser, cartController.postAddToCart);
router.patch('/cart/update-quantity', requireActiveUser, cartController.patchUpdateQuantity);
router.post('/cart/add-combo', requireActiveUser, cartController.postAddComboToCart);
router.delete('/cart/remove/:itemId', requireActiveUser, cartController.deleteRemoveItem);

// Route for display 'wishlist' 
router.get('/wishlist', requireActiveUser, wishlistController.getWishlistPage);

// Route for 'wishlist' toggle
router.post('/wishlist/toggle', requireActiveUser, wishlistController.toggleWishlistItem);

// Route for display 'checkout' page
router.get('/checkout', requireActiveUser, checkoutController.getCheckoutPage);

// Route for 'apply coupon' and 'remove' coupon during 'checkout'
router.post('/checkout/apply-coupon', requireActiveUser, checkoutController.applyCoupon);
router.post('/checkout/remove-coupon', requireActiveUser, checkoutController.removeCoupon); 

// This will handle the final "Place Order" button on the checkout page
router.post('/checkout/place-order', requireActiveUser, checkoutController.placeOrder);


// Route for 'send' 'payment details' like 'razor pay key', 'razor pay id' , 'currency', 'created date' etc and also send 'status' 'success'   
router.post('/wallet/add-money/create-order', requireActiveUser, walletController.createWalletOrder);

// For 'verify payment' and 'update' 'walletTransaction' collection(ie through 'verifyAndRechargeWallet()')and 'send' 'success' message
router.post('/wallet/add-money/verify', requireActiveUser, walletController.verifyWalletPayment);



// Router chaining for 'display' product rate and its 'process'
router.route('/product/rate/:id')
      .get( requireActiveUser, productController.getRateProductPage)
      .post(requireActiveUser, uploadReview.single('reviewImage'), productController.submitProductRating );

export default router;