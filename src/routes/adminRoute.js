
import express from 'express';
import * as adminController from '../controller/adminController/adminController.js';
import * as userController from '../controller/adminController/adminUserController.js';
import * as productController from '../controller/adminController/adminProductController.js';
import * as categoryController from '../controller/adminController/adminCategoryController.js';
import upload from '../config/multer.js';
import { isAdmin } from '../middleware/adminAuth.js';
import { uploadProduct } from '../middleware/uploadMiddleware.js';


const router = express.Router();

// Route for 'admin login'
router.route('/login')
      .get(adminController.loadLogin)
      .post(adminController.processLogin);

 // Route for 'dashboard'     
router.get('/dashboard', isAdmin, adminController.loadDashboard);


router.get('/users', isAdmin, userController.getUsersList);
router.get('/users/:id', isAdmin, userController.getUserDetails);

// router.route('/users/:id/edit')
//       .get(isAdmin, userController.loadEditUser)
//       .post(isAdmin, upload.single('image'), userController.updateUserDetails);

router.route('/users/:id/balance')
      .get(isAdmin, userController.loadEditBalance)
      .post(isAdmin, userController.updateBalance);

router.get('/users/:id/transactions', isAdmin, userController.getUserTransactions);
router.get('/users/:id/orders', isAdmin, userController.getUserOrders);
router.post('/users/:id/toggle-block', isAdmin, userController.toggleBlockStatus);


router.get('/products', isAdmin, productController.getProductsList);

router.route('/products/add')
      .get(isAdmin, productController.getAddProduct)
      .post(isAdmin, uploadProduct.array('productImages', 4), productController.postAddProduct);


router.route('/products/edit/:id')
      .get(isAdmin, productController.getEditProduct)
        .post(isAdmin, uploadProduct.array('productImages', 4), productController.postEditProduct);

router.post('/products/toggle-list/:id', isAdmin, productController.toggleProductList);

router.get('/categories', isAdmin, categoryController.getCategoriesList);

router.route('/category/add')
      .get(isAdmin, categoryController.getAddCategory)
      .post(isAdmin, categoryController.postAddCategory);

router.route('/category/edit/:id')
      .get(isAdmin, categoryController.getEditCategory)
      .post(isAdmin, categoryController.postEditCategory);


router.post('/category/toggle-list/:id', isAdmin, categoryController.toggleCategoryList);
router.post('/category/delete/:id', isAdmin, categoryController.deleteCategory);


router.get('/logout', adminController.logout);

export default router;



