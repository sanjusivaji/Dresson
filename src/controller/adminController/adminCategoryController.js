import * as adminCategoryService from '../../services/admin/adminCategoryService.js';
import logger from '../../utilities/logger.js';
import Category from '../../model/categoryModel.js';
import Product from '../../model/productModel.js';


const buildInfiniteCategoryTree = (categories, parentId = null, currentDepth = 1, parentPath = [], visited = new Set()) => {
    let tree = [];
    const children = categories.filter(item => {
        if (!parentId) return !item.parentCategory || item.parentCategory === 'none' || item.parentCategory === null;
        return item.parentCategory && item.parentCategory.toString() === parentId.toString();
    });
    for (let child of children) {
        if (visited.has(child._id.toString())) continue;
        visited.add(child._id.toString());
        const currentPath = [...parentPath, child.categoryName];
        tree.push({
            ...child,
            _id: child._id,
            categoryName: child.categoryName,
            gender: child.gender,
            depth: currentDepth,
            lineage: currentPath,
            breadcrumb: currentPath.join(' > '),
            displayName: ('— '.repeat(currentDepth - 1)) + child.categoryName
        });
        const subChildren = buildInfiniteCategoryTree(categories, child._id, currentDepth + 1, currentPath, new Set(visited));
        tree = tree.concat(subChildren);
    }
    return tree;
};


export const getCategoriesList = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 5;                                   // Display exactly 5 categories per page
        const skip = (page - 1) * limit;
        const dashboardData = await adminCategoryService.buildCategoriesListDashboard(req.query);
        const allCategories = await Category.find({}).sort({ createdAt: -1 }).lean();
        const fullTreeCategories = adminCategoryService.buildInfiniteCategoryTree(allCategories, null, 1);
        const totalCategories = fullTreeCategories.length;
        const totalPages = Math.ceil(totalCategories / limit) || 1;
        const paginatedCategories = fullTreeCategories.slice(skip, skip + limit);
        res.render('admin/categories', {
            ...dashboardData,
            categories: paginatedCategories, // Only send the 5 items for the current page
            currentPage: page,
            totalPages: totalPages,
            totalCategories: totalCategories,
            errorMessage: null,
            pageTitle: "Categories - Dresson",
            activePage: 'categories'
        });
    } catch (error) {
        logger.error("Error building dashboard categories view map:", error);
        res.status(500).send("Internal Server Error processing category listings charts.");
    }
};



export const getAddCategory = async (req, res) => {
    try {
        const allCategories = await Category.find({}).select('_id categoryName gender parentCategory').lean();
        const nestedCategories = buildInfiniteCategoryTree(allCategories, null, 1);        
        res.render('admin/addCategory', { 
            categories: nestedCategories,
            mainCategories: nestedCategories, // Passed as both to ensure compatibility with your EJS template
            errorMessage: null,
            activePage: 'categories' 
        });
    } catch (error) {
        logger.error("Error displaying add category workspace form:", error);
        res.status(500).send("Internal Server Error");
    }
};


export const postAddCategory = async (req, res) => {
    try {
        const { gender, parentCategory, categoryName, description, isListed } = req.body;
        const cleanName = categoryName.trim();
        const cleanDescription = description ? description.trim() : '';
        const generatedSlug = `${gender.toLowerCase()}-${cleanName.toLowerCase()}`
            .replace(/[^a-z0-9]+/g, '-') // Replace spaces and special characters with hyphens
            .replace(/(^-|-$)+/g, '');   // Remove leading or trailing hyphens
        const newCategory = new Category({
            gender,
            parentCategory: (!parentCategory || parentCategory === 'none') ? null : parentCategory,
            categoryName: cleanName,
            slug: generatedSlug,
            description: cleanDescription,
            isListed: isListed === 'true' || isListed === 'on' || isListed === true
        });    
        await newCategory.save();
        logger.info(`[CATEGORY CREATION] Successfully created category "${cleanName}" (${gender}) with slug: "${generatedSlug}"`);
        res.redirect('/admin/categories');
        } catch (error) {
        logger.error("Category Creation Failed:", error);
        let cleanErrorMessage = 'Failed to create category. Please check your inputs.';
        
        if (error.code === 11000 || (error.message && error.message.includes('E11000'))) {
            if (error.message.includes('categoryName') || error.message.includes('gender_1_parentCategory_1_categoryName_1')) {
                const matchedName = req.body.categoryName || 'This category';
                cleanErrorMessage = `Action Blocked: The category "${matchedName}" already exists under this exact gender section!`;
            } else if (error.message.includes('slug')) {
                cleanErrorMessage = 'Action Blocked: A category with this URL slug already exists in your catalog.';
            } else {
                cleanErrorMessage = 'Action Blocked: A duplicate category entry already exists in your hierarchy.';
            }
        } else if (error.message) {
            cleanErrorMessage = error.message;
        }
        try {
            const allCategories = await Category.find({}).lean();
            const treeCategories = adminCategoryService.buildInfiniteCategoryTree(allCategories, null, 1);
            res.render('admin/addCategory', {
                categories: treeCategories,
                formData: req.body,               // Preserves user typed text on failure
                error: cleanErrorMessage,
                errorMessage: cleanErrorMessage,            
                pageTitle: "Add Category - Dresson",
                activePage: 'categories'
            });
        } catch (fallbackError) {
            logger.error("Critical failure recovering Add Category fallback view:", fallbackError);
            res.status(500).send("Internal Server Error while attempting to recover from category creation failure.");
        }
    }
};



export const toggleCategoryList = async (req, res) => {
    try {
        await adminCategoryService.toggleCategoryListing(req.params.id);
        res.redirect('/admin/categories');
    } catch (error) {
        logger.error("Failed to alter public listings publication flag status properties:", error);
        res.status(500).send("Internal database operation mapping error.");
    }
};



export const getEditCategory = async (req, res) => {
    try {
        const editData = await adminCategoryService.fetchEditCategoryData(req.params.id);
        const allCategories = await Category.find({}).lean();
        const treeCategories = buildInfiniteCategoryTree(allCategories, null, 1);
        res.render('admin/editCategory', { 
            ...editData, 
            mainCategories: treeCategories,
            errorMessage: null,
            activePage: 'categories' 
        });
    } catch (error) {
        logger.error("Failure pulling targeted edit category form template data sets:", error);
        res.status(500).send("Internal Server Error processing catalog modification indexes.");
    }
};

export const postEditCategory = async (req, res) => {
    try {
        const { gender, categoryName } = req.body;
        const cleanName = categoryName.trim();
        const generatedSlug = `${gender.toLowerCase()}-${cleanName.toLowerCase()}`
            .replace(/[^a-z0-9]+/g, '-') // Replace spaces and special characters with hyphens
            .replace(/(^-|-$)+/g, '');   // Remove leading or trailing hyphens
        req.body.categoryName = cleanName;
        req.body.slug = generatedSlug;
        await adminCategoryService.executeCategoryUpdate(req.params.id, req.body);        
        res.redirect('/admin/categories');
    } catch (error) {
        logger.error("Critical failure executing category compilation edits sequence operations:", error);
        let cleanErrorMessage = 'Failed to update category. Please check your inputs.';
        if (error.code === 11000 || (error.message && error.message.includes('E11000'))) {
            if (error.message.includes('slug')) {
                cleanErrorMessage = 'A category with this URL slug already exists in your catalog.';
            } else {
                cleanErrorMessage = 'A category with this exact name already exists inside this gender section!';
            }
        } else if (error.message && error.message.includes('already exists')) {
            cleanErrorMessage = error.message;
        } else if (error.message) {
            cleanErrorMessage = error.message;
        }    
        try {
            const fallbackData = await adminCategoryService.fetchEditCategoryData(req.params.id);
            const allCategories = await Category.find({}).lean();
            const treeCategories = adminCategoryService.buildInfiniteCategoryTree(allCategories, null, 1);
            res.render('admin/editCategory', {
                ...fallbackData,
                mainCategories: treeCategories,  // Restores the tree dropdown on error!
                errorMessage: cleanErrorMessage, // Displays clean red banner message!
                activePage: 'categories'
            });
        } catch (fallbackError) {
            logger.error("Error recovering edit view fallback:", fallbackError);
            res.status(500).send("Internal Server Error recovering edit view.");
        }
    }
};



export const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        logger.info(`[DELETE WORKFLOW] Attempting to delete category ID: ${id}`);        
        const categoryToDelete = await Category.findById(id);
        if (!categoryToDelete) {
            return res.redirect('/admin/categories');
        }
        const childCount = await Category.countDocuments({ parentCategory: id });
        if (childCount > 0) {
            logger.warn(`[DELETE WORKFLOW] Blocked: "${categoryToDelete.categoryName}" contains ${childCount} child categories.`);            
            const childWarningMsg = `Cannot delete "${categoryToDelete.categoryName}" because it contains ${childCount} nested sub-categories. Please delete or move the child categories first!`;
            const dashboardData = await adminCategoryService.buildCategoriesListDashboard(req.query);
            return res.render('admin/categories', {
                ...dashboardData,
                pageTitle: "Categories - Dresson",
                activePage: 'categories',
                error: childWarningMsg,
                errorMessage: childWarningMsg
            });
        }
        const productCount = await Product.countDocuments({ 
            $or: [
                { subCategory: id }, 
                { category: id } 
            ] 
        });
        if (productCount > 0) {
            logger.warn(`[DELETE WORKFLOW] Blocked: "${categoryToDelete.categoryName}" is currently assigned to ${productCount} active products.`);            
            const productWarningMsg = `Action Blocked: Cannot delete "${categoryToDelete.categoryName}" because it is currently assigned to ${productCount} product(s)! Please reassign or remove those products before deleting this category.`;
            const dashboardData = await adminCategoryService.buildCategoriesListDashboard(req.query);
            return res.render('admin/categories', {
                ...dashboardData,
                pageTitle: "Categories - Dresson",
                activePage: 'categories',
                error: productWarningMsg,
                errorMessage: productWarningMsg
            });
        }
        await Category.findByIdAndDelete(id);
        logger.info(`[DELETE WORKFLOW] Successfully deleted category "${categoryToDelete.categoryName}".`);        
        res.redirect('/admin/categories');
    } catch (error) {
        logger.error("Error deleting category:", error);
        try {
            const dashboardData = await adminCategoryService.buildCategoriesListDashboard(req.query);
            res.render('admin/categories', {
                ...dashboardData,
                pageTitle: "Categories - Dresson",
                activePage: 'categories',
                error: 'Server error while attempting to delete category.',
                errorMessage: 'Server error while attempting to delete category.'
            });
        } catch (fallbackError) {
            res.status(500).send("Internal Server Error recovering dashboard after delete failure.");
        }
    }
};