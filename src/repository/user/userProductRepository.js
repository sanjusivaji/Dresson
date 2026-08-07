import Product from '../../model/productModel.js';
import Category from '../../model/categoryModel.js';

// For retrieve 'ObjectId' of 'category'
export const findCategory = async (searchTerm) => {
    return await Category.findOne({
        $or: [{ slug: searchTerm }, { categoryName: searchTerm }], // Here we retrieve first matching 'category' based on 'slug' or 'categoryName' and 'isListed: true' and finally we return only '_id'(ie '.select(_id)') and we 'leaning' because we want this data only for display.
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