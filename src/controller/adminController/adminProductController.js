import * as adminProductService from '../../services/admin/adminProductService.js';
import * as adminCategoryService from '../../services/admin/adminCategoryService.js'; 
import Category from '../../model/categoryModel.js'; 
import logger from '../../utilities/logger.js';
import { v2 as cloudinary } from 'cloudinary'; 


export const getProductsList = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = 4; 
        const skip = (page - 1) * limit;
        const queryParams = { ...req.query, page, limit, skip };
        const dashboardData = await adminProductService.buildProductsListDashboard(queryParams);
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
            activePage: 'products'
        });
    } catch (error) {
        logger.error("Failure processing inventory catalog list layout:", error);
        res.status(500).send("Internal Server Error processing inventory chart components.");
    }
};


export const getAddProduct = async (req, res) => {
    try {
        const allCategories = await Category.find({ isListed: true }).lean();
        const treeCategories = adminCategoryService.buildInfiniteCategoryTree(allCategories, null, 1);
        res.render('admin/addProduct', {
            categories: treeCategories, 
            formData: {},
            errorMessage: null,
            layout: 'layout/admin',                 
        });
    } catch (error) {
        logger.error("Error loading Add Product workspace:", error);
        res.status(500).send("Internal Server Error");
    }
};


export const postAddProduct = async (req, res) => {
    try {
        if (!req.files || req.files.length < 3) {
            const { categories } = await adminProductService.fetchProductFormOptions();
            return res.render('admin/addProduct', { 
                categories,
                error: "Catalog creation failed: A minimum of 3 product images is required.",
                formData: req.body,
                layout: 'layout/admin',
            });
        }  
        await adminProductService.executeProductCreate(req.body, req.files);
        logger.info(`[CATALOG CREATE] Successfully published product "${req.body.productName || req.body.name}"`);
        res.redirect('/admin/products');
    } catch (error) {
        logger.error("Error publishing new catalog entry:", error);
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                try {
                    const publicId = file.filename || file.public_id; 
                    if (publicId) {
                        await cloudinary.uploader.destroy(publicId);
                        logger.info(`[CLEANUP] Deleted orphaned image from Cloudinary: ${publicId}`);
                    }
                } catch (cloudinaryError) {
                    logger.error(`[CLEANUP ERROR] Failed to delete image ${file.filename}:`, cloudinaryError);
                }
            }
        }
        let cleanErrorMessage = "Internal error saving product to registry.";        
        if (error.code === 11000 || (error.message && error.message.includes('E11000'))) {
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
            const { categories } = await adminProductService.fetchProductFormOptions();
            res.render('admin/addProduct', { 
                categories,
                error: cleanErrorMessage,
                formData: req.body,
                layout: 'layout/admin',
            });
        } catch (fallbackError) {
            logger.error("Critical failure recovering Add Product view:", fallbackError);
            res.status(500).send("Internal Error writing product to registry.");
        }
    }
};


export const getEditProduct = async (req, res) => {
    try {
        const page = req.query.page || 1;
        const editData = await adminProductService.fetchEditProductData(req.params.id);
        res.render('admin/editProduct', {
            layout: 'layout/admin',
            ...editData,
            error: null, 
            formData: null,
            page: page
        });
    } catch (error) {
        logger.error("Critical failure rendering product edit view:", error);
        res.status(500).send("Internal Server Error processing catalog adjustment views.");
    }
};


// For 'process' of the 'edit' product
export const postEditProduct = async (req, res) => {
    try {
        await adminProductService.executeProductUpdate(req.params.id, req.body, req.files);
        const page = req.query.page || 1;
        res.redirect(`/admin/products?page=${page}`);
    } catch (error) {
        console.error("Critical error committing product catalog update modifications:", error);           
        if (req.files && req.files.length > 0) {
            for (const item of req.files) {
                try {
                    const publicId = item.filename || item.public_id; 
                    if (publicId) {
                        await cloudinary.uploader.destroy(publicId);
                        console.log(`[CLEANUP] Deleted orphaned new image from Cloudinary: ${publicId}`);
                    }
                } catch (cloudinaryError) {
                    console.error(`[CLEANUP ERROR] Failed to delete image:`, cloudinaryError);
                }
            }
        }
        try {
            const fallbackData = await adminProductService.fetchEditProductData(req.params.id);
            res.render('admin/editProduct', {
                ...fallbackData,
                layout: 'layout/admin',
                error: error.message || "Database collection compilation failure parsing data formats.", 
                formData: req.body, 
                activePage: 'products'
            });
        } catch (fallbackError) {
            res.status(500).send("Internal Server Error recovering edit view.", fallbackError);
        }
    }
};


// For 'toggle' product 'status'
export const toggleProductList = async (req, res) => {
    try {
        const productId = req.params.id;
        const updatedProduct = await adminProductService.toggleProductStatus(productId);
        logger.info(`[CATALOG STATUS] Toggled "${updatedProduct.name}" isListed to: ${updatedProduct.isListed}`);
        const returnUrl = req.get('referer') || '/admin/products';
        res.redirect(returnUrl);
    } catch (error) {
        logger.error("Error toggling product list status:", error);
        const returnUrl = req.get('referer') || '/admin/products';
        res.redirect(returnUrl);
    }
};