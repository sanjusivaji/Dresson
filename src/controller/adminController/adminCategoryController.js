import * as adminCategoryService from '../../services/admin/adminCategoryService.js';

export const getAddCategory = async (req, res) => {
    try {
        const mainCategories = await adminCategoryService.fetchAddCategoryOptions();
        res.render('admin/addCategory', { 
            mainCategories, 
            errorMessage: null,
            activePage: 'categories' 
        });
    } catch (error) {
        console.error("Error displaying add category workspace form:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const postAddCategory = async (req, res) => {
    try {
        await adminCategoryService.executeCategoryCreation(req.body);
        res.redirect('/admin/categories');
    } catch (error) {
        console.error("Failure during category transaction execution:", error);
        
        // Recover view data to display the error gracefully
        try {
            const mainCategories = await adminCategoryService.fetchAddCategoryOptions();
            res.render('admin/addCategory', { 
                mainCategories,
                errorMessage: error.message || "Database collection compilation failure.",
                activePage: 'categories' 
            });
        } catch (fallbackError) {
            res.status(500).send("Internal Server Error recovering workspace view.");
        }
    }
};

export const getCategoriesList = async (req, res) => {
    try {
        const dashboardData = await adminCategoryService.buildCategoriesListDashboard(req.query);
        res.render('admin/categories', {
            ...dashboardData,
            pageTitle: "Categories - Dresson",
            activePage: 'categories'
        });
    } catch (error) {
        console.error("Error building dashboard categories view map:", error);
        res.status(500).send("Internal Server Error processing category listings charts.");
    }
};

export const deleteCategory = async (req, res) => {
    try {
        await adminCategoryService.executeCategoryDeletion(req.params.id);
        res.redirect('/admin/categories');
    } catch (error) {
        console.error("Failure executing category document deletion operation:", error);
        res.redirect(`/admin/categories?error=${encodeURIComponent(error.message)}`);
    }
};

export const toggleCategoryList = async (req, res) => {
    try {
        await adminCategoryService.toggleCategoryListing(req.params.id);
        res.redirect('/admin/categories');
    } catch (error) {
        console.error("Failed to alter public listings publication flag status properties:", error);
        res.status(500).send("Internal database operation mapping error.");
    }
};

export const getEditCategory = async (req, res) => {
    try {
        const editData = await adminCategoryService.fetchEditCategoryData(req.params.id);
        res.render('admin/editCategory', { 
            ...editData, 
            errorMessage: null,
            activePage: 'categories' 
        });
    } catch (error) {
        console.error("Failure pulling targeted edit category form template data sets:", error);
        res.status(500).send("Internal Server Error processing catalog modification indexes.");
    }
};

export const postEditCategory = async (req, res) => {
    try {
        await adminCategoryService.executeCategoryUpdate(req.params.id, req.body);
        res.redirect('/admin/categories');
    } catch (error) {
        console.error("Critical failure executing category compilation edits sequence operations:", error);
        
        try {
            const fallbackData = await adminCategoryService.fetchEditCategoryData(req.params.id);
            res.render('admin/editCategory', {
                ...fallbackData,
                errorMessage: error.message || "An internal database tracking write failure occurred.",
                activePage: 'categories'
            });
        } catch (fallbackError) {
            res.status(500).send("Internal Server Error recovering edit view.");
        }
    }
};