// Up two levels to 'src', then into 'model'
import Product from '../../model/productModel.js';
import Category from '../../model/categoryModel.js';


// For retrieve 'total products count' based on the 'filter'(ie 'search or category')
export const countFilteredProducts = async (filter) => {
    return await Product.countDocuments(filter);
};

// Fetch the actual products with pagination, sorting, and population
export const getFilteredProducts = async (filter, skip, limit) => {
    return await Product.find(filter)
        .populate('subCategory') 
        .sort({ createdAt: -1 }) 
        .skip(skip)
        .limit(limit)
        .lean(); 
};

// For retrieve all 'categories' details and place data/document of 'parent category' if 'category' have 'parentCategory' 'id'.
export const findActiveCategoriesWithParents = async () => {
    return await Category.find({ isListed: true }).populate('parentCategory').sort({ categoryName: 1 });  //  It return 'all'(because of 'find()')categories based on 'isListed : true' and 'populate('parentCategory')' 'joins' 'parentCategory' ie here we 'populate' from all category and those 'category' has 'id' of 'parentCategory' it retrieve that 'parentCategory' data and display it instead that 'id' and finally sorted based on 'categoryName' in ascending order
};

// For save a new Product
export const createProduct = async (payload) => {
    const product = new Product(payload);
    return await product.save();
};

//  For 'retrieve' document based on 'product Name'
export const findProductByName = async (productName) => {
    return await Product.findOne({ 
        name: { $regex: new RegExp(`^${productName}$`, 'i') }   // It return 'first' matching 'document' from 'Product' category based on 'productName' without 'case sensitive' and '`^${productName}$` ensures 'start'(ie '^') 'exact' name and it put in 'template literals'.
    });
};


// For return product document based on 'id'
export const findProductById = async (id) => {                // It returns only 'one' 'document' from the 'Product' model that matches the given '_id'.
    return await Product.findById(id);
};


// For check and return same 'name' of product 'exist'
export const productNameCheck = async(productId, cleanProductName) => {
 return await Product.findOne({                                            // When create a product we already 'blocked' to create 'two' product with 'same' 'name', but when 'edit' time our product name is 'Blue shirt' and another product name is 'Red shirt' but we try to change 'Blue' to 'Red' without this code it possible and both product have same name, and when we retrieve product name for 'edit' this same code block all products,even 'editing' product so we should use '$ne: productId' for avoid current product.  
        name: { $regex: new RegExp(`^${cleanProductName}$`, 'i') },_id: { $ne: productId } 
    });
}


// For 'update' the 'data' based on 'id'(uses for 'edit' purpose)
export const updateProductById = async (id, updateData) => {
    return await Product.findByIdAndUpdate(id, updateData, { returnDocument: 'after' });  // '{ returnDocument: 'after' }' used for 'return' 'document' after updation 
};

// Category Operations (Needed for dropdowns in Product views)
export const findActiveCategories = async () => {
    return await Category.find({ parentCategory: { $ne: null }, isListed: true }).sort({ categoryName: 1 });
};

export const countProducts = async (filter) => {
    return await Product.countDocuments(filter);
};
