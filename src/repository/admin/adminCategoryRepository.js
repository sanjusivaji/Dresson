
import Category from '../../model/categoryModel.js';

// For return 'array' of 'main' 'categories' only(ie like "Men", "Women", or "Kids")
export const findMainCategories = async (excludeId = null) => {
    let query = { parentCategory: null };                           // Here we retrieve all data that have 'no' parent category(ie 'parentCategory: null')and we pass 'default parameter' as 'excludeId = null' but we pass actual value as 'categoryId' as 'argument and here we create a new 'property' '_id' in 'query'(ie 'query._id') and its value 'never' equal to 'categoryId' ie it return data based on 'gender', 'category name' and 'parent category' 'except' this 'categoryId' document and we pass 'default parameter' because we 'reuse' this function for both 'add'(ie when adding time there is no 'id' created already) and 'edit' purpose.  
    if (excludeId) {
        query._id = { $ne: excludeId };
    }
    return await Category.find(query).sort({ categoryName: 1 });     // Here 'categories' sort 'ascending' order(ie '{ categoryName: 1 }')
};

// For retrieve all 'categories' sorted by 'date'
export const getAllCategoriesSorted = async () => {
    return await Category.find({}).sort({ createdAt: -1 }).lean();  // Here we can use 'without' '{}' inside 'find()'(ie it means retrieve 'all' data without filter) and 'lean()' is used for 'remove' all wrapped methods and return only plain 'js' object.
};


// For retrieve 'main' categories
export const findCategoriesWithFilter = async (filterQuery, skip, limit) => {
    return await Category.find(filterQuery)                        // Here 'Category' is 'model'(ie 'collection')and 'filterQuery' is the 'object' for querying
        .populate('parentCategory')                                // It retrieve all 'document'(ie 'not' just field or entire collection)under 'parentCategory' that we created when create 'product' or 'category' etc ie 'parentCategory: men._id'
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
};

// For retrieve 'total' no.of categories
export const countCategories = async (filterQuery) => {
    return await Category.countDocuments(filterQuery);
};

// For retrieve only '_id','categoryName', 'gender', 'parentCategory' from 'Category' collection
export const getCategoriesForDropdown = async () => {
    return await Category.find({})
        .select('_id categoryName gender parentCategory')            // 'select()' is the 'built-in 'mongoose' method used for includes and excludes 'fields' we want and only used with 'query' methods like 'find()', 'findOne()', or 'findById()'.
        .lean();
};

// For retrieve 'category' based only on id
export const findCategoryById = async (id) => {
    return await Category.findById(id);
};


// For retrieve all 'category' based on 'category name', 'gender','parent category', 'except' contains 'categoryId' document.
export const findCategoryConflict = async (name, gender, parentId, excludeId = null) => {
    let query = {
        categoryName: { $regex: `^${name}$`, $options: 'i' },  // It makes case-insensitive. "shirts", "Shirts", and "SHIRTS" are treated as the 'same' word
        gender: gender,
        parentCategory: parentId
    };
    if (excludeId) {                                          // Here we pass 'default parameter' as 'excludeId = null' but we pass actual value as 'categoryId' as 'argument and here we create a new 'property' '_id' in 'query'(ie 'query._id') and its value 'never' equal to 'categoryId' ie it return data based on 'gender', 'category name' and 'parent category' 'except' this 'categoryId' document.
        query._id = { $ne: excludeId };
    }
    return await Category.findOne(query);                    // It return 'one'(ie 'findOne()') matching 'document' and other wise 'null'.
};


// For 'update' data based on id
export const updateCategoryById = async (id, updateData) => {
    return await Category.findByIdAndUpdate(id, updateData);
};

// For retrieve 'one' category based on 'parentCategory'
export const findChildCategoryByParentId = async (parentId) => {
    return await Category.findOne({ parentCategory: parentId });
};

// For retrieve 'only' 'id' of 'array of object'(ie 'find()')based 'parent category'
export const getRelatedCategoryIds = async (categoryId) => {
    return await Category.find({
        $or: [
            { _id: categoryId },              
            { parentCategory: categoryId }    
        ]
    }).select('_id').lean();                                    // It return an 'array of object' of 'catagories' based on ' current category' or 'parentCategory'(ie many subcategories have same parent category) and 'select()' includes only '_id' 
};


//  Fetch all 'isListed:true' categories 
export const getActiveCategories = async () => {
    return await Category.find({ isListed: true })
        .sort({ categoryName: 1 })
        .lean();
};





