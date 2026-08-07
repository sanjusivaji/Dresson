import * as productRepository from '../../repository/admin/adminProductRepository.js';
import * as categoryRepository from '../../repository/admin/adminCategoryRepository.js'
import { PRODUCT_PAGINATION } from '../../constants/adminProductConstants.js';
import Product from '../../model/productModel.js';
import mongoose from 'mongoose';
import Category from '../../model/categoryModel.js';
import logger from '../../utilities/logger.js'; 
import { v2 as cloudinary } from 'cloudinary';


// For return 'current products', 'categories', total pages etc
export const buildProductsListDashboard = async (query = {}) => {
   const page = Math.max(1, parseInt(query.page) || 1);          // In 'url' all value passes as 'string' so we should convert it into 'number' by using 'parseInt' and 'Math.max()' avoid the possibility crash when pass -ve value.
    const limit = parseInt(query.limit) || 4;
    const skip = (page - 1) * limit;                              // If 'page = 1' then '(page - 1) * limit' ie '1-1 * 4' = 0' ie in 'page 1' 'no' skip.
    const obj = {};    
    const andConditions = []; 
    if (query.search && query.search.trim() !== '') {             //  Here 'search' is '<input name="search">' value and 'query.search.trim()' checks after 'trimming' string has any value or not.
        const regex = new RegExp(query.search.trim(), 'i');       //  Here 'search' value is 'shirt' then it match 'SHirt', 't-shirt' etc because of 'i'.
        andConditions.push({
            $or: [                                                // '$or' 'mongodb' function can write in 'js' and should use in mongodb structure and it put inside '{ }' and its value put inside '[ ]' and it can be match any value inside it.
                { name: regex }, 
                { productName: regex }, 
                { brand: regex }
            ]
        });
    }        
    if (query.category && query.category.trim() !== '') {
        let categoryId;
        try {
            categoryId = new mongoose.Types.ObjectId(query.category.trim());  // Here 'query.category' get from 'url' and it passes as 'string' so we 'convert' this 'string' into a special 'ObjectId' data type, for 'compare' with another 'ObjectId' in mongodb.
        } catch (error) {
            categoryId = query.category.trim(); 
        }
        const relatedCategories = await categoryRepository.getRelatedCategoryIds(categoryId);  // For retrieve 'only' 'id' of 'array of object'(ie 'find()')based 'parent category'
        const categoryIdsToSearch = relatedCategories.map(item => item._id);        
        andConditions.push({ 
            subCategory: { $in: categoryIdsToSearch }                        // Here 'andConditions' is the array and later we add it into data base and '{$in: categoryIdsToSearch}'  is the filter ie 'subCategory' field contains this specific list of 'categoryId' 
        });
    }  
    if (andConditions.length > 0) {
        obj.$and = andConditions;                                           // Here '$and' is a built-in 'mongoDB' operator and 'andConditions' is the conditions for 'searching' and 'obj' is 'empty object' and here we assign conditions into 'object'(ie it creates 'array' in object) because it allows 'dynamic searching' in 'mongodb'.
    }
    const totalProducts = await productRepository.countFilteredProducts(obj); // For retrieve 'total products count' based on the 'filter'(ie 'search or category')
    const totalPages = Math.ceil(totalProducts / limit) || 1;    
    const products = await productRepository.getFilteredProducts(obj, skip, limit);// For retrieve the actual products with pagination, sorting, and population        
    const categories = await categoryRepository.getActiveCategories();        //  Fetch all 'isListed:true'(ie 'active') categories 
    return {
        products,
        totalProducts,
        totalPages,
        categories,
        isPaginated: true 
    };
};



// For process of create 'product'
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
    } = bodyData;
    const cleanProductName = (productName || '').trim();
    const existingProduct = await productRepository.findProductByName(cleanProductName);        // It return 'first' matching 'document' from 'Product' category based on 'productName' without 'case sensitive' and '`^${productName}$` ensures 'start'(ie '^') 'exact' name and it put in 'template literals'.
    if (existingProduct) {
        throw new Error(`Validation Error: A product named "${cleanProductName}" already exists in your catalog.`);
    }
    const parsedDiscount = parseInt(discount, 10);                                              // 'string' convert into 'number'
    const finalDiscount = isNaN(parsedDiscount) ? 0 : Math.min(Math.max(parsedDiscount, 0), 99);
    if (!files || files.length < 3) {                                                           // 'files' is 'built-in' object created by 'multer' contains 'images'.
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
    const totalCalculatedStock = parsedVariants.reduce((acc,item) => acc + (parseInt(item.stock) || 0), 0); // It calculates the 'totalStock'
    let normalizedAncestors = [];    
    if (categoryAncestors) {                                                    // Here 'categoryAncestors' get from '<input>'(ie passes through 'bodydata' ie 'req.body' from 'controller')and  if an admin selects two categories ie the current category is 'level' '2 or more' ancestor still can be select one, but data base expect array, ie create an 'array'  is the 'first' step of creating 'ancestor tree', and it done 'another' function. 
        normalizedAncestors = Array.isArray(categoryAncestors) ? categoryAncestors : [categoryAncestors];
    } else if (subCategory) {
        normalizedAncestors = [subCategory];                                    // It prevents crash the app because of 'undefined'
    }
    normalizedAncestors = [...new Set(normalizedAncestors.filter(Boolean))];    // '...new Set()' remove 'duplicates' from 'normalizedAncestors' and 'spread' operator return an 'array' and 'filter(Boolean)' is same like 'array.filter(item => Boolean(item))' used for 'destroys any "falsy" values (like 'null', 'undefined', "" etc) ie 'filter()' only return 'true' value and 'Boolean' value is 'null' it will be 'false' like that.    
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
        isListed: true
    };
    return await productRepository.createProduct(newProductPayload);             // Finally 'saves' the data.
};


// For 'join' those have 'parentCategories', with 'categories'.
export const fetchProductFormOptions = async () => {
    const categories = await productRepository.findActiveCategoriesWithParents();
    return { categories };
};


// For 'retrieve' 'product' and 'categories' 
export const fetchEditProductData = async (productId) => {
    const product = await productRepository.findProductById(productId);          // It returns only 'one' 'document' from the 'Product' model that matches the given '_id'.
    if (!product) throw new Error("Target catalog item not found.");    
    const categories = await productRepository.findActiveCategoriesWithParents(); // It retrieve all 'categories' details and place 'document' of 'parent category' if 'category' have 'parentCategory' 'id'.
    return { product, categories };
};

// For 'edit' process(ie make perfect values like 'discount', 'productName' etc and extract 'variants' name and ensure is it there and find 'totalStock', 'price' etc and delete the 'existing' images from 'cloudinary' and add image 'routes' to 'database')
export const executeProductUpdate = async (productId, bodyData, files) => {
    const { productName, brand, discount, parentCategory, subCategory, description, variants } = bodyData;
    const cleanProductName = (productName || '').trim();
    const existingProduct = await productRepository.productNameCheck(productId,cleanProductName);            // For check and return same 'name' of product 'exist'
    if (existingProduct) {
        throw new Error(`Validation Error: Another product is already using the name "${cleanProductName}".`);
    }
    const parsedDiscount = parseInt(discount, 10);
    const finalDiscount = isNaN(parsedDiscount) ? 0 : Math.min(Math.max(parsedDiscount, 0), 99);            // 'isNaN(parsedDiscount)' preventing 'not numbers' and 'Math.max()' 'prevents' '-ve values'(ie 'minimum' value of 'pareseDiscount' is '0') and 'Math.min()' keeps minimum value as '99'.
    const updatePayload = {
        name: (productName || '').trim(), 
        brand: (brand || '').trim(),
        discount: finalDiscount,
        parentCategory: parentCategory,
        subCategory: subCategory,
        description: (description || '').trim(),
        //isListed: isListed === 'on' || isListed === true || isListed === 'true'                        // In 'html' '<form>' 'checkbox' is 'checked', the browser sends '{isListed: 'on'}'(or 'true')in the 'req.body' but if the 'checkbox' is 'unchecked', the browser does sends 'nothing', but in 'js' 'nothing' consider as 'false' so when value is 'nothing' it becomes 'false' by default.
    };
    if (variants) {
        const parsedVariants = Object.values(variants);    
        parsedVariants.forEach(item => {                                                                // For capture 'name', 'size' etc
            if (item.name) {                                                                            // Here 'value' of 'name' is like ''S / Blue / 100%Cotton' 
                const parts = item.name.split('/').map(part => part.trim());
                if (!item.size) {
                    item.size = parts[0] || 'Standard'; 
                }
                if (!item.color) {
                    item.color = parts.length > 1 ? parts[1] : 'Standard';
                }
            }
        });
        const hasInvalidVariants = parsedVariants.some(item => !item.size || item.size.trim() === ''); // For 'ensure' 'size' variant is created.
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
        if (existingProduct && existingProduct.images && existingProduct.images.length > 0) {        //  Here 'existing product' images in 'cloudinary' during 'edit' process,ie  we should checks the images are still in 'cloudinary' of 'same' product, is it, then we should 'delete' it for 'save' the 'space' in 'cloudinary', because we add new images of 'same' product.
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
    return await productRepository.updateProductById(productId, updatePayload);                    // Here we just upload image path in database but actual images are stores in 'cloudinary' by using 'middle ware' through 'routes'.
};


// For 'toggling' and 'save' toggle status
export const toggleProductStatus = async (productId) => {
    const product = await Product.findById(productId);
    if (!product) {
        throw new Error("Product not found in database.");
    }
    product.isListed = !product.isListed;                                                           // This is for 'toggling'
    await product.save();
    return product;
};