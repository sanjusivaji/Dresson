import * as adminProductService from '../../services/admin/adminProductService.js';

export const getProductsList = async (req, res) => {
    try {
        const dashboardData = await adminProductService.buildProductsListDashboard(req.query);
        res.render('admin/products', {
            ...dashboardData,
            pageTitle: "Products - Dresson",
            activePage: 'products'
        });
    } catch (error) {
        console.error("Failure processing inventory catalog list layout:", error);
        res.status(500).send("Internal Server Error processing inventory chart components.");
    }
};

export const getAddProduct = async (req, res) => {
    try {
        const { categories } = await adminProductService.fetchProductFormOptions();
        res.render('admin/addProduct', { 
            categories,
            errorMessage: null,
            activePage: 'products'
        });
    } catch (error) {
        console.error("Error loading add product configuration workspace:", error);
        res.status(500).send("Internal Server Error loading product onboarding components.");
    }
};

export const postAddProduct = async (req, res) => {
    try {
        // Future Add Logic goes here!
        res.redirect('/admin/products');
    } catch (error) {
        console.error("Error publishing new catalog entry:", error);
        res.status(500).send("Internal Error writing product to registry.");
    }
};

export const getEditProduct = async (req, res) => {
    try {
        const editData = await adminProductService.fetchEditProductData(req.params.id);
        res.render('admin/editProduct', {
            ...editData,
            errorMessage: null,
            activePage: 'products'
        });
    } catch (error) {
        console.error("Critical failure rendering product edit view:", error);
        res.status(500).send("Internal Server Error processing catalog adjustment views.");
    }
};

export const postEditProduct = async (req, res) => {
    try {
        await adminProductService.executeProductUpdate(req.params.id, req.body, req.files);
        res.redirect('/admin/products');
    } catch (error) {
        console.error("Critical error committing product catalog update modifications:", error);
        
        // Graceful error fallback
        try {
            const fallbackData = await adminProductService.fetchEditProductData(req.params.id);
            res.render('admin/editProduct', {
                ...fallbackData,
                errorMessage: "Database collection compilation failure parsing data formats.",
                activePage: 'products'
            });
        } catch (fallbackError) {
            res.status(500).send("Internal Server Error recovering edit view.");
        }
    }
};

export const toggleProductList = async (req, res) => {
    try {
        await adminProductService.toggleProductListing(req.params.id);
        res.redirect('/admin/products');
    } catch (error) {
        console.error("Failed to alter public listings publication flag status properties:", error);
        res.status(500).send("Internal database operational mapping failure.");
    }
};