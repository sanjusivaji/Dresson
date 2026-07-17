// Up two levels to 'src', then into 'model'
import Product from '../../model/productModel.js';
import Category from '../../model/categoryModel.js';


// Product Operations
export const findProductsWithFilter = async (filter, skip, limit) => {
    return await Product.find(filter)
        .populate('subCategory')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
};

export const countProducts = async (filter) => {
    return await Product.countDocuments(filter);
};

export const findProductById = async (id) => {
    return await Product.findById(id);
};

export const updateProductById = async (id, updateData) => {
    return await Product.findByIdAndUpdate(id, updateData, { returnDocument: 'after' });
};

// Category Operations (Needed for dropdowns in Product views)
export const findActiveCategories = async () => {
    return await Category.find({ parentCategory: { $ne: null }, isListed: true }).sort({ categoryName: 1 });
};

export const findActiveCategoriesWithParents = async () => {
    return await Category.find({ isListed: true }).populate('parentCategory').sort({ categoryName: 1 });
};

export const createProduct = async (productData) => {
    return await Product.create(productData);
};