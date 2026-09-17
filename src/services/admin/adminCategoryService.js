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
    return await categoryRepository.findMainCategories();                                                                             // Returns an array of only top-level categories like "Men" or "Women"
};



// For retrieve data of 'categories'
export const buildCategoriesListDashboard = async (query) => {
    const page = parseInt(query.page) || 1;                                                                                           // Reads the page number from the request, defaults to 1 if none is provided
    const limit = CATEGORY_PAGINATION.LIMIT;
    const skip = (page - 1) * limit;
    const searchQuery = query.search || '';                                                                                           // Captures what the user typed in the search bar
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
    const categories = await categoryRepository.findCategoriesWithFilter(filterQuery, skip, limit);                                   // Gets the matching parent categories based on search
    const totalMatchingCategories = await categoryRepository.countCategories(filterQuery);                                            // Counts total matches to calculate how many pages are needed
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
    const category = await categoryRepository.findCategoryById(categoryId);                                                           // Finds the specific category to hide or show
    if (!category) {
        throw new Error("Category not found inside registry logs.");
    }
    if (category.isListed === true) {                                                                                                 // Checks if we are trying to hide a category that is currently visible
        const hasActiveSubcategories = await Category.exists({                                                                        // Checks if there are any active child categories attached to this one
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
    category.isListed = !category.isListed;                                                                                           // Flips the visibility (true becomes false, false becomes true)
    await category.save();
    return category;
};



// For create infinite category also uses in 'productController.js' 
export const buildInfiniteCategoryTree = (categories, parentId = null, currentDepth = 1, parentPath = [], visited = new Set()) => {
    let tree = [];
    const children = categories.filter(item => {
        if (!parentId) return !item.parentCategory || item.parentCategory === 'none' || item.parentCategory === null;
        return item.parentCategory && item.parentCategory.toString() === parentId.toString();                                         // Checks if item has no parent, or if its parent matches the exact given parentId
    });
    for (let item of children) {
        if (visited.has(item._id.toString())) continue;                                                                               // Skips to prevent the app from looping endlessly and crashing
        visited.add(item._id.toString());
        const currentPath = [...parentPath, item.categoryName];                                                                       // Connects the parent path with the current category name
        tree.push({                                                                                                                   // Saves all the details into our organized tree array
            ...item,
            _id: item._id,
            categoryName: item.categoryName,
            gender: item.gender,
            depth: currentDepth,
            lineage: currentPath,
            breadcrumb: currentPath.join(' > '),                                                                                      // Makes it easy to read, like "Men > Topwear > T-Shirts"
            displayName: ('— '.repeat(currentDepth - 1)) + item.categoryName                                                          // Adds visual dashes to show category level, like "-- T-Shirts"
        });
        const subChildren = buildInfiniteCategoryTree(categories, item._id, currentDepth + 1, currentPath, new Set(visited));         // Restarts the process to find deeper levels (recursion)
        tree = tree.concat(subChildren);
    }
    return tree;
};



// For retrieve both 'categories' and 'main categories' based on 'id'
export const fetchEditCategoryData = async (categoryId) => {
    const category = await categoryRepository.findCategoryById(categoryId);                                                           // Gets just the requested category object
    if (!category) throw new Error("Target data directory record not found.");
    const mainCategories = await categoryRepository.findMainCategories(categoryId);                                                   // Gets top-level categories, excluding this one so it can't be its own parent
    return { category, mainCategories };
};



// For 'update' category
export const executeCategoryUpdate = async (categoryId, bodyData) => {
    const { gender, parentCategory, categoryName, description } = bodyData;
    const standardizedName = (categoryName || '').trim();
    const isSubCategory = parentCategory && parentCategory !== 'none';
    const parentId = isSubCategory ? parentCategory : null;
    const structuralSlug = generateSlug(standardizedName);
    const conflict = await categoryRepository.findCategoryConflict(standardizedName, gender, parentId, categoryId);                   // Checks if another category already has this same name and parent setup
    if (conflict) {
        throw new Error(`Modification Collision Rejected: A classification listing named "${standardizedName}" already exists.`);
    }
    return await categoryRepository.updateCategoryById(categoryId, {                                                                  // Updates the database document with the fresh data
        categoryName: standardizedName,
        gender: gender,
        parentCategory: parentId,
        slug: structuralSlug,
        description: (description || '').trim()
    });
};


