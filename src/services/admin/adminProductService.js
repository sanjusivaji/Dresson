import * as productRepository from '../../repository/admin/adminProductRepository.js';
import * as categoryRepository from '../../repository/admin/adminCategoryRepository.js';
import Product from '../../model/productModel.js';
import mongoose from 'mongoose';
import logger from '../../utilities/logger.js'; 
import { v2 as cloudinary } from 'cloudinary';


// Gathers products, categories, and page numbers to show on the dashboard
export const buildProductsListDashboard = async (query = {}) => {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = parseInt(query.limit) || 4;
    const skip = (page - 1) * limit;
    const obj = {};    
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
        const relatedCategories = await categoryRepository.getRelatedCategoryIds(categoryId);
        const categoryIdsToSearch = relatedCategories.map(item => item._id);        
        andConditions.push({ 
            subCategory: { $in: categoryIdsToSearch }
        });
    }  
    if (andConditions.length > 0) {
        obj.$and = andConditions;
    }
    const totalProducts = await productRepository.countFilteredProducts(obj);
    const totalPages = Math.ceil(totalProducts / limit) || 1;    
    const products = await productRepository.getFilteredProducts(obj, skip, limit);
    const categories = await categoryRepository.getActiveCategories();
    return {
        products,
        totalProducts,
        totalPages,
        categories,
        isPaginated: true 
    };
};


// Processes and saves a new product to the database
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
        taxRate
    } = bodyData;
    const cleanProductName = (productName || '').trim();
    const existingProduct = await productRepository.findProductByName(cleanProductName);
    if (existingProduct) {
        throw new Error(`Validation Error: A product named "${cleanProductName}" already exists in your catalog.`);
    }
    const parsedDiscount = parseInt(discount, 10);
    const finalDiscount = isNaN(parsedDiscount) ? 0 : Math.min(Math.max(parsedDiscount, 0), 99);
    if (!files || files.length < 3) {
        throw new Error("Validation Error: A minimum of 3 cropped images is mandatory.");
    }
    const imageDetails = files.map(item => {
        const imageUrl = item.path || item.secure_url;
        const imageId = item.filename || item.public_id;
        if (!imageUrl || !imageId) {
            console.error("CRITICAL MULTER ERROR. Received file object:", item);
            throw new Error("Failed to extract Cloudinary URL from uploaded file. Please check server logs.");
        }
        return {
            url: imageUrl,
            public_id: imageId
        };
    });
    const parsedVariants = variants ? Object.values(variants) : [];
    const totalCalculatedStock = parsedVariants.reduce((acc,item) => acc + (parseInt(item.stock) || 0), 0);
    const parsedTaxRate = parseInt(taxRate, 10);
    const finalTaxRate = isNaN(parsedTaxRate) ? 0 : parsedTaxRate;
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
        taxRate: finalTaxRate,
        description: (description || '').trim(),
        images: imageDetails, 
        variants: parsedVariants,
        totalStock: totalCalculatedStock,
        isListed: true
    };
    return await productRepository.createProduct(newProductPayload);
};


// Gets categories and links sub-categories to their parent categories
export const fetchProductFormOptions = async () => {
    const categories = await productRepository.findActiveCategoriesWithParents();
    return { categories };
};


// Gets data for a single product and all categories to show on the edit page
export const fetchEditProductData = async (productId) => {
    const product = await productRepository.findProductById(productId);
    if (!product) throw new Error("Target catalog item not found.");    
    const categories = await productRepository.findActiveCategoriesWithParents();
    return { product, categories };
};


// Formats data, removes old images, and updates an existing product
export const executeProductUpdate = async (productId, bodyData, files) => {
    const { productName, brand, discount,taxRate, parentCategory, subCategory, description, variants } = bodyData;
    const cleanProductName = (productName || '').trim();
    const existingProduct = await productRepository.productNameCheck(productId,cleanProductName);
    if (existingProduct) {
        throw new Error(`Validation Error: Another product is already using the name "${cleanProductName}".`);
    }
    const parsedDiscount = parseInt(discount, 10);
    const finalDiscount = isNaN(parsedDiscount) ? 0 : Math.min(Math.max(parsedDiscount, 0), 99);
    const parsedTaxRate = parseInt(taxRate, 10);
    const finalTaxRate = isNaN(parsedTaxRate) ? 0 : parsedTaxRate;
    const updatePayload = {
        name: (productName || '').trim(), 
        brand: (brand || '').trim(),
        discount: finalDiscount,
        taxRate: finalTaxRate,
        parentCategory: parentCategory,
        subCategory: subCategory,
        description: (description || '').trim(),
    };
    if (variants) {
        const parsedVariants = Object.values(variants);    
        parsedVariants.forEach(item => {
            if (item.name) {                                                                      
                const parts = item.name.split('/').map(part => part.trim());
                if (!item.size) {
                    item.size = parts[0] || 'Standard'; 
                }
                if (!item.color) {
                    item.color = parts.length > 1 ? parts[1] : 'Standard';
                }
            }
        });
        const hasInvalidVariants = parsedVariants.some(item => !item.size || item.size.trim() === '');
        if (hasInvalidVariants) {
            throw new Error("Validation Error: Every product variant must have a valid size.");
        }
        updatePayload.variants = parsedVariants;
        updatePayload.totalStock = parsedVariants.reduce((acc,item) => acc + (parseInt(item.stock) || 0), 0);
        if (parsedVariants.length > 0 && parsedVariants[0].price) {
            updatePayload.price = Number(parsedVariants[0].price);
        }
    }
    if (files && files.length > 0) {
        if (files.length < 3) {
            throw new Error("Validation Error: A minimum of 3 cropped images is mandatory when replacing the gallery.");
        }        
        const existingProduct = await productRepository.findProductById(productId);                          
        if (existingProduct && existingProduct.images && existingProduct.images.length > 0) {
            for (const item of existingProduct.images) {
                const publicId = item.public_id; 
                if (publicId) {
                    try {
                        await cloudinary.uploader.destroy(publicId);
                    } catch (err) {
                        console.error(`Failed to delete old image ${publicId} from Cloudinary:`, err);
                    }
                }
            }
        }        
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


// Switches a product's visibility status between on and off
export const toggleProductStatus = async (productId) => {
    const product = await Product.findById(productId);
    if (!product) {
        throw new Error("Product not found in database.");
    }
    product.isListed = !product.isListed;
    await product.save();
    return product;
};

