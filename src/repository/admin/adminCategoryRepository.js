
import Category from '../../model/categoryModel.js';



// For return 'array' of 'main' 'categories' only(ie like "Men", "Women", or "Kids")
export const findMainCategories = async (excludeId = null) => {
    let query = { parentCategory: null };                                                                                             // Looks for categories that sit at the top level and have no parent
    if (excludeId) {
        query._id = { $ne: excludeId };                                                                                               // Prevents fetching the current category so we don't accidentally set it as its own parent
    }
    return await Category.find(query).sort({ categoryName: 1 });                                                                      // Sorts the categories alphabetically
};



// For retrieve all 'categories' sorted by 'date'
export const getAllCategoriesSorted = async () => {
    return await Category.find({}).sort({ createdAt: -1 }).lean();                                                                    // Retrieves everything from newest to oldest as simple JavaScript objects for faster speed
};



// For retrieve 'main' categories
export const findCategoriesWithFilter = async (filterQuery, skip, limit) => {
    return await Category.find(filterQuery)                                                                                           // Finds categories based on search input
        .populate('parentCategory')                                                                                                   // Loads full details of the parent category rather than just keeping its ID
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
        .select('_id categoryName gender parentCategory')                                                                             // Pulls only specific text fields to keep memory usage low
        .lean();
};



// For retrieve 'category' based only on id
export const findCategoryById = async (id) => {
    return await Category.findById(id);
};



// For retrieve all 'category' based on 'category name', 'gender','parent category', 'except' contains 'categoryId' document.
export const findCategoryConflict = async (name, gender, parentId, excludeId = null) => {
    let query = {
        categoryName: { $regex: `^${name}$`, $options: 'i' },                                                                         // Ignores uppercase or lowercase differences when checking names
        gender: gender,
        parentCategory: parentId
    };
    if (excludeId) {                                                                                                                  // Excludes the category being edited from the duplicate check
        query._id = { $ne: excludeId };
    }
    return await Category.findOne(query);                                                                                             // Returns the first matching duplicate if one exists
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
    }).select('_id').lean();                                                                                                          // Returns an array containing only the IDs of this category and its direct children
};



//  Fetch all 'isListed:true' categories 
export const getActiveCategories = async () => {
    return await Category.find({ isListed: true })
        .sort({ categoryName: 1 })
        .lean();
};



