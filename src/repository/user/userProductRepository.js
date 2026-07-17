import Product from '../../model/productModel.js';
import Category from '../../model/categoryModel.js';


export const findActiveCategories = async () => {
    return await Category.find({ isListed: true }).select('_id gender categoryName').lean();
};


export const countFilteredProducts = async (filterQuery) => {
    return await Product.countDocuments(filterQuery);
};


export const findPaginatedProducts = async (filterQuery, sortConfig, skip, limit) => {
    return await Product.find(filterQuery)
        .populate('subCategory', 'categoryName gender')
        .sort(sortConfig)
        .skip(skip)
        .limit(limit)
        .lean();
};