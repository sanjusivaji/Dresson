
import express from 'express';
import adminController from '../controller/adminController/adminController.js';
import userController from '../controller/adminController/adminUserController.js';
import * as productController from '../controller/adminController/adminProductController.js';
import * as categoryController from '../controller/adminController/adminCategoryController.js';
import upload from '../config/multer.js';
import { isAdmin } from '../middleware/adminAuth.js';

const router = express.Router();


router.route('/login')
      .get(adminController.loadLogin)
      .post(adminController.processLogin);

router.get('/dashboard', isAdmin, adminController.loadDashboard);


router.get('/users', isAdmin, userController.getUsersList);
router.get('/users/:id', isAdmin, userController.getUserDetails);

router.route('/users/:id/edit')
      .get(isAdmin, userController.loadEditUser)
      .post(isAdmin, upload.single('image'), userController.updateUser);

router.route('/users/:id/balance')
      .get(isAdmin, userController.loadEditBalance)
      .post(isAdmin, userController.updateBalance);

router.get('/users/:id/transactions', isAdmin, userController.getUserTransactions);
router.get('/users/:id/orders', isAdmin, userController.getUserOrders);
router.post('/users/:id/toggle-block', isAdmin, userController.toggleBlockStatus);


router.get('/products', isAdmin, productController.getProductsList);

router.route('/products/add')
      .get(isAdmin, productController.getAddProduct)
      .post(isAdmin, upload.array('productImages', 4), productController.postAddProduct);


router.route('/products/edit/:id')
      .get(isAdmin, productController.getEditProduct)
      .post(isAdmin, upload.array('productImages', 4), productController.postEditProduct);


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



// import express from 'express';
// import adminController from '../controller/adminController/adminController.js';
// import userController from '../controller/adminController/adminUserController.js';
// import upload from '../config/multer.js';
// import { isAdmin } from '../middleware/adminAuth.js';
// import * as productController from '../controller/adminController/adminProductController.js';
// import * as categoryController from '../controller/adminController/adminCategoryController.js';
// const router = express.Router();



// router.get('/products/add', isAdmin, productController.getAddProduct);

// // 2. Inject your central upload utility right here
// // 'productImages' must match the field name="productImages" in your addProduct.ejs file
// router.post('/products/add', isAdmin, upload.array('productImages', 4), productController.postAddProduct);



// // Route for 'display' 'admin login' and also processing the 'login' page
// router.route('/login')
//       .get(adminController.loadLogin)
//       .post(adminController.processLogin); // Handles your form action

// router.get('/dashboard', isAdmin, adminController.loadDashboard);

// router.get('/users', isAdmin, userController.getUsersList);

// // Route for 'dashboard'
// router.route('/users')
//     .get(userController.getUsersList);

// // Dynamic Route: View a specific user's profile
// router.route('/users/:id')
//     .get(userController.getUserDetails);

// // Dynamic Route: Load the Edit Form and Submit the Edit Form
// router.route('/users/:id/edit')
//     .get(userController.loadEditUser)
//     .post(userController.updateUser);

// router.route('/users/:id/edit')
//     .get(userController.loadEditUser)
//     .post(upload.single('image'), userController.updateUser);

// // Dynamic Route: Edit Wallet Balance
// router.route('/users/:id/balance')
//     .get(userController.loadEditBalance)
//     .post(userController.updateBalance);

// // Dynamic Route: View User Transactions
// router.route('/users/:id/transactions')
//     .get(userController.getUserTransactions);

// // Dynamic Route: View User Orders
// router.route('/users/:id/orders')
//     .get(userController.getUserOrders);

// // Dynamic Route: Target a specific user ID to toggle their block status
// router.route('/users/:id/toggle-block')
//     .post(userController.toggleBlockStatus);

// router.get('/products', isAdmin, productController.getProductsList);



// // 2. Add New Product Interface Pipeline Endpoints
// router.get('/products/add', isAdmin, productController.getAddProduct);
// router.post('/products/add', isAdmin, upload.array('productImages', 4), productController.postAddProduct);

// // 3. Edit Existing Product Form Workspace Routes
// router.get('/products/edit/:id', isAdmin, productController.getEditProduct);
// router.post('/products/edit/:id', isAdmin, upload.array('productImages', 4), productController.postEditProduct);

// // 4. Toggle Public Listing Index Visibility Action Endpoint Link
// router.post('/products/toggle-list/:id', isAdmin, productController.toggleProductList);

// router.get('/category/add', isAdmin, categoryController.getAddCategory);
// router.post('/category/add', isAdmin, categoryController.postAddCategory);


// router.get('/categories', isAdmin, categoryController.getCategoriesList);

// // 3. Dynamic Public Listing Index Toggle Action Link Endpoint
// router.post('/category/toggle-list/:id', isAdmin, categoryController.toggleCategoryList);

// // Append into your category schema pipelines segment inside src/router/adminRouter.js

// // 1. Render form with historical values populated
// router.get('/category/edit/:id', isAdmin, categoryController.getEditCategory);
// router.post('/category/edit/:id', isAdmin, categoryController.postEditCategory);
// router.post('/admin/category/delete/:id', isAdmin, categoryController.deleteCategory);

// export default router;