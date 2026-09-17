import Product from '../../model/productModel.js';
import Category from '../../model/categoryModel.js';

// Counts how many products match the search or category filter
export const countFilteredProducts = async (filter) => {
    return await Product.countDocuments(filter);
};


// Gets the actual list of products based on the filter and page number
export const getFilteredProducts = async (filter, skip, limit) => {
    return await Product.find(filter)
        .populate('subCategory') 
        .sort({ createdAt: -1 }) 
        .skip(skip)
        .limit(limit)
        .lean(); 
};


// Gets all active categories and connects them to their parent category data
export const findActiveCategoriesWithParents = async () => {
    return await Category.find({ isListed: true }).populate('parentCategory').sort({ categoryName: 1 });                       // Swaps out the parent ID with the full parent details
};


// Saves a new product to the database
export const createProduct = async (payload) => {
    const product = new Product(payload);
    return await product.save();
};


// Finds a product matching the exact name ignoring uppercase/lowercase
export const findProductByName = async (productName) => {
    return await Product.findOne({ 
        name: { $regex: new RegExp(`^${productName}$`, 'i') }                                                                 // Matches the whole name from start to finish
    });
};


// Finds one specific product using its ID number
export const findProductById = async (id) => {                                                    
    return await Product.findById(id);
};


// Checks if a different product is already using a specific name
export const productNameCheck = async(productId, cleanProductName) => {
 return await Product.findOne({                                                                                               // Ignores the current product so it doesn't clash with itself during an edit
        name: { $regex: new RegExp(`^${cleanProductName}$`, 'i') },_id: { $ne: productId } 
    });
}


// Updates a specific product's data based on its ID
export const updateProductById = async (id, updateData) => {
    return await Product.findByIdAndUpdate(id, updateData, { returnDocument: 'after' });                                      // Returns the product data after it has been updated
};


// Gets active categories that have a parent category
export const findActiveCategories = async () => {
    return await Category.find({ parentCategory: { $ne: null }, isListed: true }).sort({ categoryName: 1 });
};


// Counts total products based on a filter
export const countProducts = async (filter) => {
    return await Product.countDocuments(filter);
};