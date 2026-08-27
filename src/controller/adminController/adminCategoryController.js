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
        return item.parentCategory && item.parentCategory.toString() === parentId.toString();                          // Here '3' 'if condition' wrote in 'single' line ie there is 'no' 'parentId'(ie '!parentId'), and 'item' has no 'parentCategory' and also check 'item.parentCategory.toString() === parentId.toString()' ie both are in 'objectId' format so for comparisn we shoudl convert into 'string'
    });
    for (let item of children) {
        if (visited.has(item._id.toString())) continue;                            // Here 'visited' is 'Set' object and we can create 'Shirt' under 'Top wear' but without 'Set' we can create subcategory as 'reversly'(ie 'Top wear' under 'Shirt' and it cause the 'stack overflow' crash) and 'countinue' skip particular iteration, ie here we just prevent 'display' same category('not' about adding)
        visited.add(item._id.toString());
        const currentPath = [...parentPath, item.categoryName];                    // 'Spread' operator creates 'combined array'.
        tree.push({                                                                //  Here all items in the object added into 'tree' array,(ie created above) by using 'push()'. 
            ...item,
            _id: item._id,
            categoryName: item.categoryName,
            gender: item.gender,
            depth: currentDepth,
            lineage: currentPath,
            breadcrumb: currentPath.join(' > '),                                   // Here convert 'array' to 'human readable(ie '["Men", "Topwear", "T-Shirts"]' into '"Men > Topwear > T-Shirts")
            displayName: ('— '.repeat(currentDepth - 1)) + item.categoryName       // This if for 'visual indication' of 'levels' ie initial value of 'currentDepth' is '1' and it increase each recursion, and 'repeat()' is the 'string' method and 'string.repeat(count)' is the 'syntax'(ie '-.repeat(2)' means '- -') and it added to 'category name'.
        });
        const subChildren = buildInfiniteCategoryTree(categories, item._id, currentDepth + 1, currentPath, new Set(visited)); // This is 'recursion' and when we call 'new Set(visited)' it creates a 'new' 'Set' object with value of 'visited' ie when we use 'visited' inside it, passes the reference and it is good when 'recursion' other wise if use 'visited' itself, make 'missing data'.
        tree = tree.concat(subChildren);
    }
    return tree;
};


// For display 'categories' page
export const getCategoriesList = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;                                       // We can retrieve 'page' value through 'req.query.page' from 'https://localhost:3000/admin/categories?page=2' and if 'no' value captures , we 'defaultly' put '1' for prevent 'crash' the app.                             
        const limit = PAGINATION.ADMIN_TABLE_LIMIT;                                       // From 'src/constants/pagination.js' file and its value '5'.                                                                               
        const searchQuery = req.query.search ? req.query.search.trim() : '';
        const allCategories = await categoryRepository.getAllCategoriesSorted();          //  Retrieve 'all' 'category' item data 'sorted' based on 'date'.               
        let categoryTree = buildInfiniteCategoryTree(allCategories, null, 1);             // Created just 'above' and it returns a flat 'array of objects'(ie named 'tree'),and perfectly sorted in 'parent-to-child' order         
        if (searchQuery) {
            const searchLower = searchQuery.toLowerCase();                                
            categoryTree = categoryTree.filter(item =>                                    //  Here 'categoryName', 'gender', 'description' etc makes to 'lower case'(ie 'toLowerCase()') and checks if it 'include' in  'search query'.
                (item.categoryName && item.categoryName.toLowerCase().includes(searchLower)) ||  // Here '&&' operator return 'first' 'false' value and if 'item.categoryName' is 'null/undefined' code return 'falsy' value and it 'prevents' 'crashing' the app when 'categoryName'(ie if it is 'null') trying to 'lower case'(ie 'item.categoryName.toLowerCase()')
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
            activePage: 'categories',                                                       // For 'side bar' 'violet' color in 'admin' page.       
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
        const allCategories = await categoryRepository.getCategoriesForDropdown();           // Retrieve 'category' collection with only 'fields' that '_id','categoryName', 'gender', 'parentCategory'
        const nestedCategories = buildInfiniteCategoryTree(allCategories, null, 1);          // 'buildInfiniteCategoryTree()' created above.    
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
            .replace(/[^a-z0-9]+/g, '-')                                                          // except 'a to z' and '0 to 9' all others like 'special characters' etc 'replace' with '-'. 
            .replace(/(^-|-$)+/g, '');                                                            // Here it 'removes'/ 'replaces' the 'startiing hiphen'(ie '^-') 'OR'(ie '|')'ending hiphen'('-$')and at least 'one' or 'more'(ie '+'), Eg, '-mens-shirts-' output: 'mens-shirts'.
        const newCategory = new Category({                                                        // It creates 'new document' adn later it saved by 'save()'
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
            if (error.code === 11000 || (error.message && error.message.includes('E11000'))) {                                      // 'E11000' is 'built-in' error code created by 'mongodb' when violating 'unique: true' index.
                if (error.message.includes('categoryName') || error.message.includes('gender_1_parentCategory_1_categoryName_1')) { //  If 'categoryName' already there
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
                const allCategories = await categoryRepository.getAllCategoriesSorted();      // Retrieve all 'sorted' categories.
                const treeCategories = buildInfiniteCategoryTree(allCategories, null, 1);
                res.render('admin/addCategory', {                                             // This is 'rendering' in 'catch' case ie if 'cannot' save document, still page 'remain' what already 'typed' data.
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
    const page = req.query.page || 1;                                 // It tells which 'page' the user is currently on
    try {
        const categoryId = req.params.id;        
        await adminCategoryService.toggleCategoryListing(categoryId);// For change the 'toggle' staus and 'save' new status in 'collection'
        res.redirect(`/admin/categories?page=${page}`);              // It used for send the user back to the 'exact' page they were on after the 'backend' unlist or list
    } catch (error) {
        logger.error("Toggle Blocked:", error.message);        
        const encodedMessage = encodeURIComponent(error.message);   //  'encodeURIComponent()' is the 'built-in' 'js' method and 'error' passes through 'url' but it should not have 'white space', 'commas' etc so 'Product is not defined" becomes 'Product%20is%20not%20defined'.
        res.redirect(`/admin/categories?page=${page}&error=${encodedMessage}`); 
    }
};


// For 'edit' category
export const getEditCategory = async (req, res) => {
    try {
        const editData = await adminCategoryService.fetchEditCategoryData(req.params.id); // It returns both 'categories' and 'main categories' based on 'id'
        const allCategories = await Category.find({}).lean();                             // Return all categories data.
        const treeCategories = buildInfiniteCategoryTree(allCategories, null, 1);         // Created just above for build 'infinitive' categories.
        res.render('admin/editCategory', { 
            ...editData, 
            mainCategories: treeCategories,
            errorMessage: null,
            activePage: 'categories'                                                     // For 'side bar' 'violet' color in 'admin' page.           
        });
    } catch (error) {
        logger.error("Failure pulling targeted edit category form template data sets:", error);
        res.status(500).send("Internal Server Error processing catalog modification indexes.");
    }
};

// For 'upload' the 'edit' category
export const postEditCategory = async (req, res) => {
    try {
        const { gender, categoryName } = req.body;                                                 // Retrieve through 'req.body' data get from '<form>  <input>'
        const cleanName = categoryName.trim();
        const generatedSlug = `${gender.toLowerCase()}-${cleanName.toLowerCase()}`
             .replace(/[^a-z0-9]+/g, '-')                                                          // except 'a to z' and '0 to 9' all others like 'special characters' etc 'replace' with '-'. 
             .replace(/(^-|-$)+/g, '');                                                            // Here it 'removes'/ 'replaces' the 'startiing hiphen'(ie '^-') 'OR'(ie '|')'ending hiphen'('-$')and at least 'one' or 'more'(ie '+'), Eg, '-mens-shirts-' output: 'mens-shirts'.
        req.body.categoryName = cleanName;
        req.body.slug = generatedSlug;
        await adminCategoryService.executeCategoryUpdate(req.params.id, req.body);                 // For 'update' category 
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
            const fallbackData = await adminCategoryService.fetchEditCategoryData(req.params.id);         // For retrieve both 'categories' and 'main categories' based on 'id'
            const allCategories = await Category.find({}).lean();                                         // For retrieve all categories.
            const treeCategories = adminCategoryService.buildInfiniteCategoryTree(allCategories, null, 1);// For create infinite tree 
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
        const childCount = await Category.countDocuments({ parentCategory: id });                             //  In 'category' collection each category is 'stores' in seperate 'array of object' and each 'child' has its own 'gender' and 'parentCategory', so if we count 'parentCategory', then it return 'total' documents that contains certain 'parentCategory'.
        if (childCount > 0) {
            logger.warn(`[DELETE WORKFLOW] Blocked: "${categoryToDelete.categoryName}" contains ${childCount} child categories.`);            
            const childWarningMsg = `Cannot delete "${categoryToDelete.categoryName}" because it contains ${childCount} nested sub-categories. Please delete or move the child categories first!`;
            const dashboardData = await adminCategoryService.buildCategoriesListDashboard(req.query);          // For retrieve data of 'categories'
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
            const dashboardData = await adminCategoryService.buildCategoriesListDashboard(req.query);          // For retrieve data of 'categories'
            return res.render('admin/categories', {
                ...dashboardData,
                pageTitle: "Categories - Dresson",
                activePage: 'categories',
                error: productWarningMsg,
                errorMessage: productWarningMsg
            });
        }
        await Category.findByIdAndDelete(id);                                                               // If above '2' 'if conditions' not catch, here 'delete' the 'category' successfully.
        logger.info(`[DELETE WORKFLOW] Successfully deleted category "${categoryToDelete.categoryName}".`);        
        res.redirect('/admin/categories');
    } catch (error) {
        logger.error("Error deleting category:", error);
        try {
            const dashboardData = await adminCategoryService.buildCategoriesListDashboard(req.query);       // For retrieve data of 'categories'
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