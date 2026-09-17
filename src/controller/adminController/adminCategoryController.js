
import * as adminCategoryService from '../../services/admin/adminCategoryService.js';
import logger from '../../utilities/logger.js';
import Category from '../../model/categoryModel.js';
import Product from '../../model/productModel.js';
import { PAGINATION } from '../../constants/pagination.js';
import * as categoryRepository from '../../repository/admin/adminCategoryRepository.js';



// For create infinite 'level' of 'category' recursively and it used in this 'file
const buildInfiniteCategoryTree = (categories, parentId = null, currentDepth = 1, parentPath = [], visited = new Set()) => {
    let tree = [];
    const children = categories.filter(item => {
        if (!parentId) return !item.parentCategory || item.parentCategory === 'none' || item.parentCategory === null;
        return item.parentCategory && item.parentCategory.toString() === parentId.toString();                                         // Checks if item has no parent, or if its parent matches the given parentId exactly
    });
    for (let item of children) {
        if (visited.has(item._id.toString())) continue;                                                                               // Skips this category if already checked to avoid an endless loop that crashes the app
        visited.add(item._id.toString());
        const currentPath = [...parentPath, item.categoryName];                                                                       // Combines the parent's path with the current category name to make a full path
        tree.push({                                                                                                                   // Adds all item details into the new tree array
            ...item,
            _id: item._id,
            categoryName: item.categoryName,
            gender: item.gender,
            depth: currentDepth,
            lineage: currentPath,
            breadcrumb: currentPath.join(' > '),                                                                                      // Converts the array into readable text like "Men > Topwear > Shirts"
            displayName: ('— '.repeat(currentDepth - 1)) + item.categoryName                                                          // Adds dashes before the name based on depth for visual spacing (e.g., "-- Shirts")
        });
        const subChildren = buildInfiniteCategoryTree(categories, item._id, currentDepth + 1, currentPath, new Set(visited));         // Calls itself (recursion) to find sub-categories, passing a fresh copy of 'visited'
        tree = tree.concat(subChildren);
    }
    return tree;
};



// For display 'categories' page
export const getCategoriesList = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;                                                                                   // Gets the page number from the URL, defaulting to 1 to prevent app crashes
        const limit = PAGINATION.ADMIN_TABLE_LIMIT;                                                                                   // Maximum number of items per page, taken from constants (e.g., 5)
        const searchQuery = req.query.search ? req.query.search.trim() : '';
        const allCategories = await categoryRepository.getAllCategoriesSorted();                                                      // Fetches all categories sorted by date
        let categoryTree = buildInfiniteCategoryTree(allCategories, null, 1);                                                         // Builds the parent-to-child nested array using the function above
        if (searchQuery) {
            const searchLower = searchQuery.toLowerCase();
            categoryTree = categoryTree.filter(item =>                                                                                // Filters the list if the user typed something in the search box
                (item.categoryName && item.categoryName.toLowerCase().includes(searchLower)) ||                                       // Checks if category name includes the search word securely without crashing on null
                (item.gender && item.gender.toLowerCase().includes(searchLower)) ||
                (item.description && item.description.toLowerCase().includes(searchLower))
            );
        }
        const totalCategories = categoryTree.length;
        const totalPages = Math.ceil(totalCategories / limit) || 1;
        const skip = (page - 1) * limit;
        const paginatedCategories = categoryTree.slice(skip, skip + limit);
        res.render('admin/categories', {
            categories: paginatedCategories,
            currentPage: page,
            totalPages: totalPages,
            totalCategories: totalCategories,
            errorMessage: req.query.error || null,
            pageTitle: "Categories - Dresson",
            activePage: 'categories',                                                                                                 // Highlights the 'categories' tab in violet on the admin sidebar
            searchQuery: searchQuery
        });
    } catch (error) {
        logger.error("Error building dashboard categories view map:", error);
        res.status(500).send("Internal Server Error processing category listings charts.");
    }
};



// For 'display' 'add categories' page
export const getAddCategory = async (req, res) => {
    try {
        const allCategories = await categoryRepository.getCategoriesForDropdown();                                                    // Gets limited category data (just ID, name, gender, parent) to keep it fast
        const nestedCategories = buildInfiniteCategoryTree(allCategories, null, 1);                                                   // Organizes them into the parent-child tree format
        res.render('admin/addCategory', {
            categories: nestedCategories,
            mainCategories: nestedCategories,
            errorMessage: null,
            activePage: 'categories'
        });
    } catch (error) {
        logger.error("Error displaying add category workspace form:", error);
        res.status(500).send("Internal Server Error");
    }
};



// For 'save' new 'category' document
export const postAddCategory = async (req, res) => {
    try {
        const { gender, parentCategory, categoryName, description, isListed } = req.body;
        const cleanName = categoryName.trim();
        const cleanDescription = description ? description.trim() : '';
        const generatedSlug = `${gender.toLowerCase()}-${cleanName.toLowerCase()}`
            .replace(/[^a-z0-9]+/g, '-')                                                                                              // Replaces any spaces or special characters with a hyphen
            .replace(/(^-|-$)+/g, '');                                                                                                // Removes extra hyphens at the very beginning or end of the text
        const newCategory = new Category({                                                                                            // Prepares the new category data before saving to the database
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
        if (error.code === 11000 || (error.message && error.message.includes('E11000'))) {                                            // MongoDB throws 'E11000' if we try to save a duplicate name where it must be unique
            if (error.message.includes('categoryName') || error.message.includes('gender_1_parentCategory_1_categoryName_1')) {       // Specific check if the category name is already taken
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
            const allCategories = await categoryRepository.getAllCategoriesSorted();                                                  // Fetches categories again so the form dropdown still works
            const treeCategories = buildInfiniteCategoryTree(allCategories, null, 1);
            res.render('admin/addCategory', {                                                                                         // Re-renders the page with the previous typed data so the user doesn't lose their work
                categories: treeCategories,
                formData: req.body,
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



// For 'toggle' category 'list' and 'unlist'
export const toggleCategoryStatus = async (req, res) => {
    const page = req.query.page || 1;                                                                                                 // Tracks which page the user was on before clicking toggle
    try {
        const categoryId = req.params.id;
        await adminCategoryService.toggleCategoryListing(categoryId);                                                                 // Flips the visibility status and saves it
        res.redirect(`/admin/categories?page=${page}`);                                                                               // Sends the user back to the exact page they were on
    } catch (error) {
        logger.error("Toggle Blocked:", error.message);
        const encodedMessage = encodeURIComponent(error.message);                                                                     // Converts text with spaces (like error messages) into a safe URL format
        res.redirect(`/admin/categories?page=${page}&error=${encodedMessage}`);
    }
};



// For 'edit' category
export const getEditCategory = async (req, res) => {
    try {
        const editData = await adminCategoryService.fetchEditCategoryData(req.params.id);                                             // Gets the data for the category we want to edit
        const allCategories = await Category.find({}).lean();                                                                         // Gets all categories as simple objects to build the dropdown
        const treeCategories = buildInfiniteCategoryTree(allCategories, null, 1);                                                     // Builds the parent-to-child nested array
        res.render('admin/editCategory', {
            ...editData,
            mainCategories: treeCategories,
            errorMessage: null,
            activePage: 'categories'                                                                                                  // Highlights the 'categories' tab in violet on the admin sidebar
        });
    } catch (error) {
        logger.error("Failure pulling targeted edit category form template data sets:", error);
        res.status(500).send("Internal Server Error processing catalog modification indexes.");
    }
};



// For 'upload' the 'edit' category
export const postEditCategory = async (req, res) => {
    try {
        const { gender, categoryName } = req.body;                                                                                    // Grabs data typed into the form by the user
        const cleanName = categoryName.trim();
        const generatedSlug = `${gender.toLowerCase()}-${cleanName.toLowerCase()}`
             .replace(/[^a-z0-9]+/g, '-')                                                                                             // Replaces spaces and symbols with a hyphen
             .replace(/(^-|-$)+/g, '');                                                                                               // Cleans up stray hyphens at the start or end
        req.body.categoryName = cleanName;
        req.body.slug = generatedSlug;
        await adminCategoryService.executeCategoryUpdate(req.params.id, req.body);                                                    // Sends the updated data to save in the database
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
            const fallbackData = await adminCategoryService.fetchEditCategoryData(req.params.id);                                     // Refetches data if saving fails
            const allCategories = await Category.find({}).lean();                                                                     // Refetches the full list for dropdowns
            const treeCategories = adminCategoryService.buildInfiniteCategoryTree(allCategories, null, 1);                            // Rebuilds the nested tree structure
            res.render('admin/editCategory', {
                ...fallbackData,
                mainCategories: treeCategories,
                errorMessage: cleanErrorMessage,
                activePage: 'categories'
            });
        } catch (fallbackError) {
            logger.error("Error recovering edit view fallback:", fallbackError);
            res.status(500).send("Internal Server Error recovering edit view.");
        }
    }
};



// For 'delete' category
export const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        logger.info(`[DELETE WORKFLOW] Attempting to delete category ID: ${id}`);
        const categoryToDelete = await Category.findById(id);
        if (!categoryToDelete) {
            return res.redirect('/admin/categories');
        }
        const childCount = await Category.countDocuments({ parentCategory: id });                                                     // Counts how many sub-categories belong to this exact category
        if (childCount > 0) {
            logger.warn(`[DELETE WORKFLOW] Blocked: "${categoryToDelete.categoryName}" contains ${childCount} child categories.`);
            const childWarningMsg = `Cannot delete "${categoryToDelete.categoryName}" because it contains ${childCount} nested sub-categories. Please delete or move the child categories first!`;
            const dashboardData = await adminCategoryService.buildCategoriesListDashboard(req.query);                                 // Gets the latest categories data to display the page safely again
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
            const dashboardData = await adminCategoryService.buildCategoriesListDashboard(req.query);                                 // Gets the latest categories data to display the page safely again
            return res.render('admin/categories', {
                ...dashboardData,
                pageTitle: "Categories - Dresson",
                activePage: 'categories',
                error: productWarningMsg,
                errorMessage: productWarningMsg
            });
        }
        await Category.findByIdAndDelete(id);                                                                                         // Successfully deletes if it has no child categories or products attached
        logger.info(`[DELETE WORKFLOW] Successfully deleted category "${categoryToDelete.categoryName}".`);
        res.redirect('/admin/categories');
    } catch (error) {
        logger.error("Error deleting category:", error);
        try {
            const dashboardData = await adminCategoryService.buildCategoriesListDashboard(req.query);                                 // Recovers the page if a server error happens
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