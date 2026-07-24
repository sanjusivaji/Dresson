import * as productRepository from '../../repository/admin/adminProductRepository.js';
import { PRODUCT_PAGINATION } from '../../constants/adminProductConstants.js';
import Product from '../../model/productModel.js';
import mongoose from 'mongoose';
import Category from '../../model/categoryModel.js';
import logger from '../../utilities/logger.js'; 


export const executeProductCreate = async (bodyData, files) => {
    const { 
        productName, 
        brand, 
        discount, 
        parentCategory, 
        subCategory, 
        categoryAncestors, 
        description, 
        variants, 
        isListed 
    } = bodyData;
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
    let normalizedAncestors = [];    
    if (categoryAncestors) {
        normalizedAncestors = Array.isArray(categoryAncestors) ? categoryAncestors : [categoryAncestors];
    } else if (subCategory) {
        normalizedAncestors = [subCategory]; 
    }
    normalizedAncestors = [...new Set(normalizedAncestors.filter(Boolean))];
    const newProductPayload = {
        name: (productName || '').trim(),         
        brand: (brand || 'Dresson Original').trim(),
        parentCategory: parentCategory,
        subCategory: subCategory,
        categoryAncestors: normalizedAncestors, 
        discount: finalDiscount,
        description: (description || '').trim(),
        images: imageDetails, 
        variants: parsedVariants,
        totalStock: totalCalculatedStock,
        isListed: isListed === 'on' || isListed === true || isListed === 'true'
    };
    return await productRepository.createProduct(newProductPayload);
};



export const buildProductsListDashboard = async (query = {}) => {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = parseInt(query.limit) || 4;
    const skip = (page - 1) * limit;    
    const filter = {};    
    const andConditions = []; 
    if (query.search && query.search.trim() !== '') {
        const regex = new RegExp(query.search.trim(), 'i');
        andConditions.push({
            $or: [
                { name: regex }, 
                { productName: regex }, 
                { brand: regex }
            ]
        });
    }    
    if (query.category && query.category.trim() !== '') {
        let categoryId;
        try {
            categoryId = new mongoose.Types.ObjectId(query.category.trim());
        } catch (error) {
            categoryId = query.category.trim(); 
        }
        const relatedCategories = await Category.find({
            $or: [
                { _id: categoryId },              // Matches if it's the exact child category
                { parentCategory: categoryId }    // Matches all children if a parent was selected
            ]
        }).select('_id').lean();
        const categoryIdsToSearch = relatedCategories.map(cat => cat._id);
        andConditions.push({ 
            subCategory: { $in: categoryIdsToSearch } 
        });
    }
    if (andConditions.length > 0) {
        filter.$and = andConditions;
    }
    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limit) || 1;    
    const products = await Product.find(filter)
        .populate('subCategory') 
        .sort({ createdAt: -1 }) 
        .skip(skip)
        .limit(limit)
        .lean();        
    const categories = await Category.find({ isListed: true }).sort({ categoryName: 1 }).lean();    
    return {
        products,
        totalProducts,
        totalPages,
        categories,
        isPaginated: true 
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

export const toggleProductStatus = async (productId) => {
    const product = await Product.findById(productId);
    if (!product) {
        throw new Error("Product not found in database.");
    }
    product.isListed = !product.isListed;
    await product.save();
    return product;
};