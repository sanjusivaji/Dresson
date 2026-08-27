import * as adminProductService from '../../services/admin/adminProductService.js';
import * as adminCategoryService from '../../services/admin/adminCategoryService.js'; 
import Category from '../../model/categoryModel.js'; 
import logger from '../../utilities/logger.js';
import { v2 as cloudinary } from 'cloudinary'; 


// For 'display' products
export const getProductsList = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = 4; 
        const skip = (page - 1) * limit;
        const queryParams = { ...req.query, page, limit, skip };                                  // 'queryParams' contains 'page', 'limint', 'skip'
        const dashboardData = await adminProductService.buildProductsListDashboard(queryParams);  // It return 'products' 'array of object' and 'category' array of object  and in 'products' contains 'name','brand','fabric', 'parentCategory', 'image', 'variants'(array'), 'isListed', 'reviews', 'createdAt' etc and in 'categories' contains its '_id','gender', 'parentCategory', 'categoryName', 'slug', 'category description', 'createdAt' etc.  
        const totalProducts = dashboardData.totalProducts || (dashboardData.products ? dashboardData.products.length : 0);
        const totalPages = dashboardData.totalPages || Math.ceil(totalProducts / limit) || 1;
        let paginatedProducts = dashboardData.products || [];
        if (paginatedProducts.length > limit && !dashboardData.isPaginated) {
            paginatedProducts = paginatedProducts.slice(skip, skip + limit);
        }
        res.render('admin/products', {
            ...dashboardData,
            products: paginatedProducts,
            currentPage: page,                
            totalPages: totalPages,                 
            totalProducts: totalProducts,
            searchQuery: req.query.search || '',    
            selectedCategory: req.query.category || '', 
            pageTitle: "Products - Dresson",
            activePage: 'products'                                                        // For 'display' 'violet' color in sidebar.
        });
    } catch (error) {
        logger.error("Failure processing inventory catalog list layout:", error);
        res.status(500).send("Internal Server Error processing inventory chart components.");
    }
};


// For display 'addProduct' page
export const getAddProduct = async (req, res) => {
    try {
        const allCategories = await Category.find({ isListed: true }).lean();
        const treeCategories = adminCategoryService.buildInfiniteCategoryTree(allCategories, null, 1);  // For create infinite category
        res.render('admin/addProduct', {
            categories: treeCategories, 
            formData: {},
            errorMessage: null,
            activePage: 'products'                    
        });
    } catch (error) {
        logger.error("Error loading Add Product workspace:", error);
        res.status(500).send("Internal Server Error");
    }
};

// For 'addProduct' process
export const postAddProduct = async (req, res) => {
    try {
        if (!req.files || req.files.length < 3) {                                        // Here 'files' is the 'built-in' property created by 'multer' and here we check at least '3' 'images'.
            const { categories } = await adminProductService.fetchProductFormOptions();  // For 'join' those have 'parentCategories', with 'categories', by using 'populate' method
            return res.render('admin/addProduct', { 
                categories,                                                              // Here we 'rendering' in 'error' case, and then also we should need 'categories' because 'error' should display between normal display.
                error: "Catalog creation failed: A minimum of 3 product images is required.",
                formData: req.body,
                activePage: 'products'
            });
        }  
        await adminProductService.executeProductCreate(req.body, req.files);              // After structuring the 'data' it 'saved' in 'database'.   
        logger.info(`[CATALOG CREATE] Successfully published product "${req.body.productName || req.body.name}"`);
        res.redirect('/admin/products');
    } catch (error) {
        logger.error("Error publishing new catalog entry:", error);
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                try {
                    const publicId = file.filename || file.public_id; 
                    if (publicId) {
                        await cloudinary.uploader.destroy(publicId);                                 // Here 'uploader' is the 'cloudinary' object and '.destroy()' is its method and it use to 'remove' 'publicId'(ie 'image' id) of the 'product' only in the 'error' case.
                        logger.info(`[CLEANUP] Deleted orphaned image from Cloudinary: ${publicId}`);
                    }
                } catch (cloudinaryError) {
                    logger.error(`[CLEANUP ERROR] Failed to delete image ${file.filename}:`, cloudinaryError);
                }
            }
        }
        let cleanErrorMessage = "Internal error saving product to registry.";        
        if (error.code === 11000 || (error.message && error.message.includes('E11000'))) {   // '11000' is 'built-in error' code return automatically from 'mongodb' for a "Duplicate Key Error".
            if (error.message.includes('sku')) {
                const matchedSku = error.message.match(/sku:\s*"(.*?)"/);
                const skuName = matchedSku ? matchedSku[1] : 'this SKU';
                cleanErrorMessage = `Action Blocked: A product variant with SKU "${skuName}" already exists in your catalog! Please generate unique SKUs.`;
            } else if (error.message.includes('name')) {
                cleanErrorMessage = `Action Blocked: A product with this exact name already exists in your inventory!`;
            } else {
                cleanErrorMessage = `Action Blocked: A duplicate product or SKU code already exists in your catalog.`;
            }
        } else if (error.message) {
            cleanErrorMessage = error.message; 
        }
        try {
            const { categories } = await adminProductService.fetchProductFormOptions();             // For 'join' those have 'parentCategories', with 'categories'.
            res.render('admin/addProduct', { 
                categories,
                error: cleanErrorMessage,                                                           // 'cleanErrorMessage' is used for 'display' error message. 
                formData: req.body,                                                                 // Here we send 'req.body' in 'catch' block again, because when error occurs, we did 'not' write again. 
                activePage: 'products'
            });
        } catch (fallbackError) {
            logger.error("Critical failure recovering Add Product view:", fallbackError);
            res.status(500).send("Internal Error writing product to registry.");
        }
    }
};


// For display 'edit' product 
export const getEditProduct = async (req, res) => {
    try {
        const page = req.query.page || 1;
        const editData = await adminProductService.fetchEditProductData(req.params.id);  // It 'retrieve' 'product' and 'categories' 
        res.render('admin/editProduct', {
            ...editData,
            error: null, 
            formData: null,
            activePage: 'products',
            page: page
        });
    } catch (error) {
        logger.error("Critical failure rendering product edit view:", error);
        res.status(500).send("Internal Server Error processing catalog adjustment views.");
    }
};



// For 'edit' product process
export const postEditProduct = async (req, res) => {
    try {
        await adminProductService.executeProductUpdate(req.params.id, req.body, req.files);   // It is used for 'edit' process(ie make perfect values like 'discount', 'productName' etc and extract 'variants' name and ensure is it there and find 'totalStock', 'price' etc and delete the 'existing' images from 'cloudinary' and add image 'routes' to 'database')
        const page = req.query.page || 1;
        res.redirect(`/admin/products?page=${page}`);                                         // For redirecting to 'same' page that 'edited'
    } catch (error) {
        console.error("Critical error committing product catalog update modifications:", error);           
        if (req.files && req.files.length > 0) {
            for (const item of req.files) {
                try {
                    const publicId = item.filename || item.public_id; 
                    if (publicId) {
                        await cloudinary.uploader.destroy(publicId);                        // If any 'error' occurs we 'delete' the 'uploaded' image from 'cloudinary' and uploader' is the 'cloudinary' object and '.destroy()' is the method and it use to 'remove' 'publicId'(ie 'image' id) of the 'product' only in the 'error' case.             
                        console.log(`[CLEANUP] Deleted orphaned new image from Cloudinary: ${publicId}`);
                    }
                } catch (cloudinaryError) {
                    console.error(`[CLEANUP ERROR] Failed to delete image:`, cloudinaryError);
                }
            }
        }
        try {
            const fallbackData = await adminProductService.fetchEditProductData(req.params.id); // For 'retrieve' 'product' and 'categories' 
            res.render('admin/editProduct', {
                ...fallbackData,
                error: error.message || "Database collection compilation failure parsing data formats.", 
                formData: req.body, 
                activePage: 'products'
            });
        } catch (fallbackError) {
            res.status(500).send("Internal Server Error recovering edit view.");
        }
    }
};


// For 'toggle' product list
export const toggleProductList = async (req, res) => {
    try {
        const productId = req.params.id;
        const updatedProduct = await adminProductService.toggleProductStatus(productId);                         // For 'toggling' and 'save' toggle status      
        logger.info(`[CATALOG STATUS] Toggled "${updatedProduct.name}" isListed to: ${updatedProduct.isListed}`);
        const returnUrl = req.get('referer') || '/admin/products';                                               // Here in 'req.get('referer')' 'req' is 'object' created by 'express' and 'get()' is 'built-in' method of 'req' object used for capture data in 'req' object and 'referer' is 'built-in' 'HTTP' 'header' that send 'browser' to 'server' automatically and it contains 'complete url'(ie 'http://localhost:3000/admin/products?page=5')includes 'page number' of 'web page' and when we 'toggle' from 'page5', data recieve in 'backend' after 'toggling' and then 'referer' helps display  the exact 'web page' that we 'toggle' other wise it goes to 'initial page'
        res.redirect(returnUrl);
    } catch (error) {
        logger.error("Error toggling product list status:", error);
        const returnUrl = req.get('referer') || '/admin/products';
        res.redirect(returnUrl);
    }
};

