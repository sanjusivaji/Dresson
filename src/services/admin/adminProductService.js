import * as productRepository from '../../repository/admin/adminProductRepository.js';
import { PRODUCT_PAGINATION } from '../../constants/adminProductConstants.js';

export const executeProductCreate = async (bodyData, files) => {
    const { productName, brand, discount, parentCategory, subCategory, description, variants, isListed } = bodyData;

    const parsedDiscount = parseInt(discount, 10);
    const finalDiscount = isNaN(parsedDiscount) ? 0 : Math.min(Math.max(parsedDiscount, 0), 99);

    if (!files || files.length < 3) {
        throw new Error("Validation Error: A minimum of 3 cropped images is mandatory.");
    }
    const imageDetails = files.map(file => {
        const imageUrl = file.path || file.secure_url;
        const imageId = file.filename || file.public_id;
        if (!imageUrl || !imageId) {
            console.error("CRITICAL MULTER ERROR. Received file object:", file);
            throw new Error("Failed to extract Cloudinary URL from uploaded file. Please check server logs.");
        }
        return {
            url: imageUrl,
            public_id: imageId
        };
    });

    const parsedVariants = variants ? Object.values(variants) : [];
    const totalCalculatedStock = parsedVariants.reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0);

    const newProductPayload = {
        name: (productName || '').trim(),         
        brand: (brand || 'Dresson Original').trim(),
        parentCategory: parentCategory,
        subCategory: subCategory,
        discount: finalDiscount,
        description: (description || '').trim(),
        images: imageDetails, // Inject the bulletproofed array
        variants: parsedVariants,
        totalStock: totalCalculatedStock,
        isListed: isListed === 'on' || isListed === true
    };
    return await productRepository.createProduct(newProductPayload);
};



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
    const { productName, brand, discount, parentCategory, subCategory, description, variants, isListed } = bodyData;
    const parsedDiscount = parseInt(discount, 10);
    const finalDiscount = isNaN(parsedDiscount) ? 0 : Math.min(Math.max(parsedDiscount, 0), 99);
    const updatePayload = {
        name: (productName || '').trim(), 
        brand: (brand || '').trim(),
        discount: finalDiscount,
        parentCategory: parentCategory,
        subCategory: subCategory,
        description: (description || '').trim(),
        isListed: isListed === 'on' || isListed === true || isListed === 'true'
    };

    if (variants) {
        const parsedVariants = Object.values(variants);
        updatePayload.variants = parsedVariants;
        updatePayload.totalStock = parsedVariants.reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0);
        if (parsedVariants.length > 0 && parsedVariants[0].price) {
            updatePayload.price = Number(parsedVariants[0].price);
        }
    }
    if (files && files.length > 0) {
        if (files.length < 3) {
            throw new Error("Validation Error: A minimum of 3 cropped images is mandatory when replacing the gallery.");
        }
        
        // CRITICAL: Convert Multer/Cloudinary files into the exact object format required by your Schema!
        const imageDetails = files.map(file => {
            const imageUrl = file.path || file.secure_url;
            const imageId = file.filename || file.public_id;

            if (!imageUrl || !imageId) {
                throw new Error("Failed to extract Cloudinary URL from uploaded file.");
            }

            return {
                url: imageUrl,
                public_id: imageId
            };
        });
        updatePayload.images = imageDetails; 
    }
    return await productRepository.updateProductById(productId, updatePayload);
};

export const toggleProductListing = async (productId) => {
    const product = await productRepository.findProductById(productId);
    if (!product) throw new Error("Target product instance missing.");

    product.isListed = !product.isListed;
    await product.save();
    return product;
};