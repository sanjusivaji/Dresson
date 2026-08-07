import * as categoryRepository from '../../repository/admin/adminCategoryRepository.js';
import { CATEGORY_PAGINATION } from '../../constants/adminCategoryConstants.js';
import Category from '../../model/categoryModel.js';
import Product from '../../model/productModel.js'

// For create 'slug' and use inside the file
const generateSlug = (name) => {
    return name.toLowerCase()
               .replace(/[^a-z0-9\s-]/g, '')
               .replace(/\s+/g, '-')
               .trim();
};

// For retrieve 'main' categories
export const fetchAddCategoryOptions = async () => {
    return await categoryRepository.findMainCategories();  // `it return 'array' of 'main' 'categories' only(ie like "Men", "Women", or "Kids")
};


// For retrieve data of 'categories'
export const buildCategoriesListDashboard = async (query) => {
    const page = parseInt(query.page) || 1;     //  Here 'query' is the 'object' will send from 'controller'(ie we capture 'page' data from 'req.query.page' in 'controller' and we send this 'page' data from 'controller' to 'service' through 'query' object and in 'service' we do 'not' use 'req' object ie we do 'not' directly contact with 'browser' api)
    const limit = CATEGORY_PAGINATION.LIMIT;
    const skip = (page - 1) * limit;
    const searchQuery = query.search || '';    // 'search' is the 'name' attribute in '<input>'(ie '<input type="text" name="search">')and it retrieve in 'controller' and send it from 'controller' to 'service' through 'query' object. 
    const error_msg = query.error || null;
    let filterQuery = {};
    if (searchQuery) {
        filterQuery = {
            $or: [
                { categoryName: { $regex: searchQuery, $options: 'i' } },
                { gender: { $regex: searchQuery, $options: 'i' } },
                { description: { $regex: searchQuery, $options: 'i' } }
            ]
        };
    }
    const categories = await categoryRepository.findCategoriesWithFilter(filterQuery, skip, limit);  // 'findCategoriesWithFilter()' return all parent categories.
    const totalMatchingCategories = await categoryRepository.countCategories(filterQuery);           //  It retrieve 'total' no.of categories for find 'total pages'
    return {
        categories,
        searchQuery,
        error_msg,
        currentPage: page,
        totalPages: Math.ceil(totalMatchingCategories / limit)
    };
};

// For 'toggling' ie 'list' and 'unlisting' category
export const toggleCategoryListing = async (categoryId) => {
    const category = await categoryRepository.findCategoryById(categoryId);     // Retrieve only one 'category' based on 'id'     
    if (!category) {
        throw new Error("Category not found inside registry logs.");
    }
    if (category.isListed === true) {                                         // Here it checks 'category' contains 'isListed:true' and then if we want to turn 'isListed: false' we should check the category contains other 'subcaterories' or 'products' is it, we 'cannot' turn into 'isListed:false' also send an 'error' message to display in 'front end'. 
        const hasActiveSubcategories = await Category.exists({                // Here 'exists()' is 'built-in' 'mongoose' method and it used for check whether ‘document’ is ‘exists’ or ‘not’ ie if ‘document’ exists it return ‘id’ and other wise return ‘null’   and if we use 'Category.findOne()’(ie ‘Category’ is ‘collection’/‘model’ name) it return entire 'document' but 'exists()' return only 'true' or 'false’.   
            parentCategory: categoryId,
            isListed: true
        });        
        if (hasActiveSubcategories) {
            throw new Error("Action Blocked: Please unlist all subcategories before unlisting this parent category.");
        }
        const hasActiveProducts = await Product.exists({ 
            category: categoryId,
            isListed: true 
        }); 
        if (hasActiveProducts) {
            throw new Error("Action Blocked: Please unlist all attached products before unlisting this category.");
        }
    }
    category.isListed = !category.isListed;                                // For 'toggling' and after it, we 'save' the 'toggle' status of 'category' in model(ie 'category.save()').             
    await category.save();    
    return category;
};


// For create infinite category also uses in 'productController.js' 
export const buildInfiniteCategoryTree = (categories, parentId = null, currentDepth = 1, parentPath = [], visited = new Set()) => {
    let tree = [];
    const children = categories.filter(item => {
        if (!parentId) return !item.parentCategory || item.parentCategory === 'none' || item.parentCategory === null;
        return item.parentCategory && item.parentCategory.toString() === parentId.toString();                          // Here '3' 'if condition' wrote in 'single' line ie there is 'no' 'parentId'(ie '!parentId'), and 'item' has no 'parentCategory' and also check 'item.parentCategory.toString() === parentId.toString()' ie both are in 'objectId' format so for comparisn we shoudl convert into 'string'
    });
    for (let item of children) {
        if (visited.has(item._id.toString())) continue;                            // Here 'visited' is 'Set' object and we can create 'Shirt' under 'Top wear' but without 'Set' we can create subcategory as 'reversly'(ie 'Top wear' under 'Shirt' and it cause the 'stack overflow' crash) and 'countinue' skip particular itertion, ie here we just prevent 'display' same category('not' about adding)
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


// For retrieve both 'categories' and 'main categories' based on 'id'
export const fetchEditCategoryData = async (categoryId) => {
    const category = await categoryRepository.findCategoryById(categoryId);            // For retrieve 'category' based only on 'id'
    if (!category) throw new Error("Target data directory record not found.");
    const mainCategories = await categoryRepository.findMainCategories(categoryId);    // For retrieve 'array' of 'main' 'categories' only(ie like "Men", "Women", or "Kids")
    return { category, mainCategories };
};


// For 'update' category
export const executeCategoryUpdate = async (categoryId, bodyData) => {
    const { gender, parentCategory, categoryName, description } = bodyData;
    const standardizedName = (categoryName || '').trim();
    const isSubCategory = parentCategory && parentCategory !== 'none';
    const parentId = isSubCategory ? parentCategory : null;
    const structuralSlug = generateSlug(standardizedName);
    const conflict = await categoryRepository.findCategoryConflict(standardizedName, gender, parentId, categoryId);  // For retrieve 'one' 'category'(because of 'category.findOne()') based on 'category name', 'gender','parent category', 'except' contains 'categoryId' document, and if 'category' with that exact value, 'repository' returns that document (ie 'conflict' has a 'value'), and the 'service' layer blocks the 'edit'.
    if (conflict) {
        throw new Error(`Modification Collision Rejected: A classification listing named "${standardizedName}" already exists.`);
    }
    return await categoryRepository.updateCategoryById(categoryId, {                   // For 'update' data based on 'id'
        categoryName: standardizedName,
        gender: gender,
        parentCategory: parentId,
        slug: structuralSlug,
        description: (description || '').trim()
    });
};


