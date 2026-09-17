
import express from 'express';
import * as adminController from '../controller/adminController/adminController.js';
import * as userController from '../controller/adminController/adminUserController.js';
import * as productController from '../controller/adminController/adminProductController.js';
import * as categoryController from '../controller/adminController/adminCategoryController.js';
import { isAdmin } from '../middleware/adminAuth.js';
import { uploadProduct } from '../middleware/uploadMiddleware.js';
import * as couponController from '../controller/adminController/couponController.js';
import * as adminOrderController from '../controller/adminController/adminOrderController.js'
import { uploadBanner } from '../middleware/uploadMiddleware.js';
import * as bannerController from '../controller/adminController/bannerController.js';
import * as offerController from '../controller/adminController/offerController.js'
import * as adminAnalyticsController from '../controller/adminController/adminAnalyticsController.js';


const router = express.Router();



// Route for 'admin login'
router.route('/login')
      .get(adminController.loadLogin)
      .post(adminController.processLogin);

 // Route for 'dashboard'     
router.get('/dashboard', isAdmin, adminController.loadDashboard);


router.get('/users', isAdmin, userController.getUsersList);
router.get('/users/:id', isAdmin, userController.getUserDetails);



// Route for 'display' user 'balance' in 'admin' and its 'process'
router.route('/users/:id/balance')
      .get(isAdmin, userController.loadEditBalance)
      .post(isAdmin, userController.updateBalance);

router.get('/users/:id/transactions', isAdmin, userController.getUserTransactions);
//router.get('/users/:id/orders', isAdmin, userController.getUserOrders);
router.get('/users/:id/orders', userController.getUserOrdersList);
router.post('/users/:id/toggle-block', isAdmin, userController.toggleBlockStatus);


// Route for 'display' admin 'product' page
router.get('/products', isAdmin, productController.getProductsList);


// Router chaining for 'display' admin 'product add' page and its 'process'
router.route('/products/add')
      .get(isAdmin, productController.getAddProduct)
      .post(isAdmin, uploadProduct.array('productImages', 4), productController.postAddProduct);      // Here 'uploadProduct' is the 'multer' middleware and it handle upload images, video etc into 'cloudinary'.


// Router chaining for 'display' admin 'product edit' page and its 'process'
router.route('/products/edit/:id')
      .get(isAdmin, productController.getEditProduct)
      .post(isAdmin, uploadProduct.array('productImages', 4), productController.postEditProduct);


router.post('/products/toggle-list/:id', isAdmin, productController.toggleProductList);


// Routes for 'display' category list
router.get('/categories', isAdmin, categoryController.getCategoriesList);


// Routes for 'toggle' category list
router.post('/category/toggle/:id', categoryController.toggleCategoryStatus);


// Route for 'admin category' 'add'
router.route('/category/add')
      .get(isAdmin, categoryController.getAddCategory)
      .post(isAdmin, categoryController.postAddCategory);


// Route for 'admin category' 'edit'.
router.route('/category/edit/:id')
      .get(isAdmin, categoryController.getEditCategory)
      .post(isAdmin, categoryController.postEditCategory);


// router.post('/category/toggle-list/:id', isAdmin, categoryController.toggleCategoryList);
router.post('/category/delete/:id', isAdmin, categoryController.deleteCategory);


// Route for 'logout' admin
router.get('/logout', adminController.logout);


// Route for admin 'coupon' page display
router.get('/coupons', isAdmin, couponController.loadCouponsPage);


// Router chaining for 'display' admin 'add coupon' page and its 'process'
router.route('/coupons/add')
    .get(isAdmin, couponController.loadAddCouponPage)
    .post(isAdmin, couponController.createCoupon);


// Router chaining for 'display' admin 'edit coupon' page and its 'process'
router.route('/coupons/edit/:id')
    .get(isAdmin, couponController.loadEditCouponPage)
    .post(isAdmin, couponController.updateCoupon);


// Route for 'orders' page in admin 
router.get('/orders', isAdmin, adminOrderController.getAdminOrdersPage);
router.get('/orders/:id', isAdmin, adminOrderController.getAdminOrderDetailsPage);
router.post('/orders/:id/status', isAdmin, adminOrderController.updateOrderStatus);


// Route for 'order return' page in admin
router.get('/returns', isAdmin, adminOrderController.getAdminReturnsPage);
router.get('/returns/:id', isAdmin, adminOrderController.getAdminReturnDetailsPage);
router.post('/returns/:id/process', isAdmin, adminOrderController.processReturnRequest);


// Route for 'banner'
router.get('/banner', bannerController.getBannersPage);   
router.post('/banner/add', uploadBanner.array('bannerImages', 5), bannerController.addBanner);      // 'Displaying' 'coupon add' page from 'banner' page itself so there is 'no' seperate 'GET' method for '/banner/add'.
router.route('/banner/edit/:id')                                                                    // 'Router chaining' for 'banner edit'
      .get(bannerController.getEditBannerPage)
      .post(uploadBanner.single('bannerImage'), bannerController.editBanner);
router.delete('/banner/delete/:id', bannerController.deleteBanner);


router.get('/offers', isAdmin, offerController.renderOfferManagement);
router.get('/offers/add', isAdmin, offerController.renderAddOffer);
router.post('/offers', isAdmin, offerController.processAddOffer);
router.get('/offers/edit/:id', isAdmin, offerController.renderEditOffer);
router.post('/offers/edit/:id', isAdmin, offerController.processEditOffer);
router.post('/offers/delete/:id', isAdmin, offerController.deleteOffer);


router.get('/analytics',  isAdmin, adminAnalyticsController.loadAnalyticsPage);
router.get('/analytics/export/pdf',  isAdmin, adminAnalyticsController.exportReportPDF);
router.get('/analytics/export/excel',  isAdmin, adminAnalyticsController.exportReportExcel);



export default router;



