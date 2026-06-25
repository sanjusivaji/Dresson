import * as productRepository from '../../repository/admin/adminProductRepository.js';
import { PRODUCT_PAGINATION } from '../../constants/adminProductConstants.js';

export const buildProductsListDashboard = async (query) => {
    const page = parseInt(query.page) || 1;
    const limit = PRODUCT_PAGINATION.LIMIT;
    const skip = (page - 1) * limit;
    
    const searchQuery = query.search || '';
    const selectedCategory = query.category || ''; 

    let filterQuery = {};
    
    if (searchQuery) {
        filterQuery.$or = [
            { productName: { $regex: searchQuery, $options: 'i' } },
            { brand: { $regex: searchQuery, $options: 'i' } }
        ];
    }

    if (selectedCategory) {
        filterQuery.subCategory = selectedCategory;
    }

    const products = await productRepository.findProductsWithFilter(filterQuery, skip, limit);
    const totalProductsCount = await productRepository.countProducts(filterQuery);
    const categories = await productRepository.findActiveCategories();

    return {
        products,
        categories,
        searchQuery,
        selectedCategory,
        currentPage: page,
        totalPages: Math.ceil(totalProductsCount / limit)
    };
};

export const fetchProductFormOptions = async () => {
    const categories = await productRepository.findActiveCategoriesWithParents();
    return { categories };
};

export const fetchEditProductData = async (productId) => {
    const product = await productRepository.findProductById(productId);
    if (!product) throw new Error("Target catalog item not found.");
    
    const categories = await productRepository.findActiveCategoriesWithParents();
    return { product, categories };
};

export const executeProductUpdate = async (productId, bodyData, files) => {
    const { productName, brand, parentCategory, subCategory, description, variants } = bodyData;

    let updateFields = {
        productName: (productName || '').trim(),
        brand: (brand || '').trim(),
        parentCategory,
        subCategory,
        description: (description || '').trim(),
        variants: variants ? Object.values(variants) : [] 
    };

    // Process incoming files array if new images were uploaded
    if (files && files.length > 0) {
        const newImagePaths = files.map(file => `/uploads/${file.filename}`); 
        updateFields.productImages = newImagePaths;
    }

    return await productRepository.updateProductById(productId, updateFields);
};

export const toggleProductListing = async (productId) => {
    const product = await productRepository.findProductById(productId);
    if (!product) throw new Error("Target product instance missing.");

    product.isListed = !product.isListed;
    await product.save();
    return product;
};