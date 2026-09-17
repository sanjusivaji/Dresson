import Product from '../../model/productModel.js';
import Category from '../../model/categoryModel.js';
import User from  '../../model/userModel.js'


// For retrieve 'ObjectId' of 'category'
export const findCategory = async (searchTerm) => {
    return await Category.findOne({
        $or: [{ slug: searchTerm }, { categoryName: searchTerm }],                                                         // Here we retrieve first matching 'category' based on 'slug' or 'categoryName' and 'isListed: true' and finally we return only '_id'(ie '.select(_id)') and we 'leaning' because we want this data only for display.
        isListed: true
    })
    .select('_id')
    .lean();
};


// For retrieve product based on 'productId'
export const findProduct = async(productId) => {
    return await Product.findById(productId).lean();
}


// For retriev 'product' based on 'productId' and 'populates' its subCategory.
export const findProductCategory = async(productId) => {
    return await Product.findOne({ 
            _id: productId, 
            isListed: true 
        }).populate('subCategory').lean();
}


// For retrieve 'category' collection data, based on 'isListed: true' and only return '_id', 'gender', 'categoryName'
export const findActiveCategories = async () => {
    return await Category.find({ isListed: true }).select('_id gender categoryName').lean();
};


// Counting 'Product' documents based on 'filterQuery'
export const countFilteredProducts = async (filterQuery) => {
    return await Product.countDocuments(filterQuery);
};


// For retrieve 'Product' data based on 'filterQuery' and 'populating' 'subCategory', 'categoryName'(both are from 'category' collection) and 'gender'(from 'User' collection)
export const findPaginatedProducts = async (filterQuery, sortConfig, skip, limit) => {
    return await Product.find(filterQuery)
        .populate('subCategory', 'categoryName gender')
        .sort(sortConfig)
        .skip(skip)
        .limit(limit)
        .lean();
};


// Retrieve 'Product' data based on 'subCategoryId', 'excludeProductId', 'isListed: true' etc
export const findRelatedProducts = async (subCategoryId, excludeProductId, limit = 4) => {
    return await Product.find({
        subCategory: subCategoryId,
        _id: { $ne: excludeProductId },
        isListed: true
    })
    .limit(limit)
    .lean();
};


// Retrieve all 'Product' data based on 'prodctId'
export const findProductByIdDoc = async (productId) => {
    return await Product.findById(productId); 
};


// Retrieve all 'Product' data based on 'prodctId' and 'leaning' for 'display'
export const findProductByIdLean = async (productId) => {
    return await Product.findById(productId).lean(); 
};


// Retrieve 'user' data based on 'userId' and 'leaning'
export const findUserByIdLean = async (userId) => {
    return await User.findById(userId).lean();
};