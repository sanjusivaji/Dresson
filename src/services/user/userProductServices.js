import mongoose from 'mongoose';
import Product from '../../model/productModel.js';
import Category from '../../model/categoryModel.js';
import paginate from '../../utilities/paginationHelper.js'; 
import { SHOP_CONSTANTS } from '../../constants/shopConstants.js'; 
import * as  productRepository from '../../repository/user/userProductRepository.js'
import { PRODUCT_CONSTANTS } from '../../constants/userProductConstants.js';
import Banner from '../../model/bannerModel.js';
import logger from '../../utilities/logger.js'; 
import Offer from '../../model/offerModel.js';


// For return 'products' , 'categories' , variants etc
export const compileShopCatalog = async (queryParams) => {
    const searchQuery = (queryParams.search || '').trim();
    const sortOption = queryParams.sort || 'newest';                          // Its value get when 'sort by' section
    const categoryFilter = queryParams.category || '';                        // Its value(ie an 'ObjectId') get when select 'categories' in home page
    const brandFilter = queryParams.brand || '';
    const colorFilter = queryParams.color || '';
    const sizeFilter = queryParams.size || '';
    const fabricFilter = queryParams.fabric || '';
    const maxPriceFilter = Number(queryParams.maxPrice) || SHOP_CONSTANTS.DEFAULT_MAX_PRICE;
    const page = Math.max(1, Number(queryParams.page) || 1);
    const limit = SHOP_CONSTANTS.DEFAULT_PAGE_LIMIT;
    const genderFilter = (queryParams.gender || '').trim();    
    const categoryQuery = { isListed: true };

    if (genderFilter) {
        categoryQuery.gender = new RegExp(`^${genderFilter}$`, 'i');
    }
    const activeCategories = await Category.find(categoryQuery).select('_id gender categoryName parentCategory slug').lean();  // 'select()' is the 'built-in 'mongoose' method used for includes and excludes 'fields’(ie ‘.select('_id categoryName gender parentCategory’)’) we want and only used with 'query' methods like 'find()', 'findOne()', or 'findById()'. 
    const activeCategoryIds = activeCategories.map(item => item._id);    

    const queryFilter = {
        isListed: true
    };    
    const andConditions = [];    

    if (activeCategoryIds.length > 0) {   
        andConditions.push({
            $or: [
                { subCategory: { $in: activeCategoryIds } },                         // Here 'subCategory' is the field name in 'mongodb'(ie created in 'Prodct' model) and we create a 'query' ie checks 'activeCategoryIds' is in 'subCategory' or 'not' and we send this 'query' below(ie 'queryFilter.$and = andConditions' then we send 'queryFilter' with 'paginate()')  
                { categoryAncestors: { $in: activeCategoryIds } },
                { subCategory: { $exists: false } },
                { subCategory: null }
            ]
        });
    }    

    if (genderFilter) {
        queryFilter.parentCategory = new RegExp(`^${genderFilter}$`, 'i');          // Here 'queryFilter' object already contains 'isListed: ture' and here we add 'parentCategory' property and if 'gender' is 'Men' then our 'queryFilter' is like '{ isListed: true, parentCategory: 'Men' }'.
    }     

    if (categoryFilter) {
        let targetId = categoryFilter;
        if (!mongoose.Types.ObjectId.isValid(categoryFilter)) {                    // Here checks 'categoryFilter' is a 'ObjectId' or not, and  if it is not, we 'can' retrieve it based on 'categoryName' or 'slug'. 
            const foundCat = await productRepository.findCategory(categoryFilter); // It retrieve active 'categories' based on 'categoryName' or 'slug'.
            targetId = foundCat ? foundCat._id : null;                             // Here value of 'foundCat' is like '{_id: 60c72b2f4f1a2562b8123456}' so here we retrieve just 'value' only. 
        }
        if (targetId) {
            andConditions.push({                                                  // Here 'andConditions' is the 'array' and we just put/push all 'conditions' into it for 'querying' in 'mongodb' later 
                $or: [
                    { categoryAncestors: targetId },                              // Here 'targetId' is the 'ObjectId' of the 'category' that belongs to the product and here we check if this 'targetId' belongs to 'subCategory' or 'categoryAncestors' display all products under that 'targetId' or 'category id'
                    { subCategory: targetId }
                ]
            });
        } else {
            queryFilter._id = null;
        }
    }    

    if (brandFilter) queryFilter.brand = brandFilter;                            // 'queryFilter' is the 'object' that created just above and here we add a 'property' 'brand' and its value 'brandFilter'(ie it captured at top).    

    if (searchQuery) {
        const regex = new RegExp(searchQuery, 'i');                             //  Value of 'searchQuery' capture from 'search' bar.
        andConditions.push({
            $or: [
                { name: regex },                                                // Here value of 'regex' is 'case insensitive' 'searchQuery'(ie it may be 'name', 'brand', 'product' etc put user in 'search' bar).
                { productName: regex },
                { brand: regex },
                { description: regex }
            ]
        });
    }

    if (colorFilter) andConditions.push({ 'variants.color': { $regex: `^${colorFilter}$`, $options: 'i' } });  // It is for 'color' filter in 'home' page and capture value of 'color'(ie 'colorFilter') above and we add it into 'variants' array as 'color' property(ie 'variants.color') 
    if (sizeFilter) andConditions.push({ 'variants.size': { $regex: `^${sizeFilter}$`, $options: 'i' } });
    if (fabricFilter) andConditions.push({ fabric: { $regex: fabricFilter, $options: 'i' } });                 // 'fabric' is 'not' part of 'variants' array.

    const priceRule = { $lte: maxPriceFilter };                                                                // It is for 'price range' in 'home' page and value 'maxPriceFilter' fixed as '10000' and here we assign value of 'priceRule' as 'less than equal to'(ie '$lte')'10000'.
    andConditions.push({ 'variants.0.price': priceRule });                                                     // Here '0' represents the 'index' ie 'frst' product/ item and we 'sorting' price range based on first item in 'home' page.                    

    if (andConditions.length > 0) {
        queryFilter.$and = andConditions;                                                                      // Here 'queryFilter' is 'object' and 'andConditions' is the 'array of object'(ie 'object' means different conditions like '{"variants.color": {"$regex":"^Blue$","$options":"i"}}' etc) so here we add each 'objects' inside array after '$and:' operator(ie '{"isListed": true, "$and": [{ "variants.color": { "$regex": "^Blue$", "$options": "i" } },.....]}') ie '$and' means 'consider' these condition also.
    }    

    let sortConfig = { createdAt: -1 };                                                                        // It is for 'default' date in 'descending order'(ie 'newest' date first) and it is for 'defult' display purpose ie if the user visits the 'home' page 'without' clicking any specific sorting buttons, the database will automatically show them the 'newest arrivals' first.
    if (sortOption === 'price_asc') sortConfig = { 'variants.0.price': 1 };                                    // Here 'sortOption' data will get from 'req.query.sort' and 'sortConfig' is the 'object' is sort product based on 'descending' order based on created date and 'price_asc' is the 'custom keyword', we send from 'home' page and if it is same(ie 'sortOption === 'alpha_asc')'variants.0.price': value sorted in 'ascending' order(ie ''variants.0.price': 1') otherwise(ie 'price_desc') it will sorted in 'descending' order(ie ''variants.0.price': -1')
    if (sortOption === 'price_desc') sortConfig = { 'variants.0.price': -1};
    if (sortOption === 'alpha_asc') sortConfig = { name: 1 };                                                  // Sorts 'name' based on custom word 'alpha_asc'
    if (sortOption === 'alpha_desc') sortConfig = { name: -1 };

    const [paginatedData, availableBrands,heroBanners] = await Promise.all([                                              // Here we destructuring the array return by 'Promise.all()' resolved value and 'Promise.all()' only works with 'Promise' objects and almost every 'mongoose' methods(ie  '.find()', '.findOne()', '.countDocuments()', '.save()', '.updateOne()' etc)create a 'Promise' object.
        paginate(Product, queryFilter, {                                                                      // 'paginate' is the 'custom' function created in 'src/utilities/paginationHelper.js' and used for return value as 'chunks' instead return all data, and we pass '3' arguments in it , 'model'(ie 'Product'), 'query'(ie 'queryFilter')and 'options'(ie query options like 'skip', 'sort', 'limit', 'populate' etc )
            page,
            limit,
            sort: sortConfig,
            populate: { path: 'subCategory', select: 'categoryName gender slug' },                              // Here 'populate' is the 'argument' and it passes to 'paginate()' function, that is in 'src/utilities/paginateHelper.js' and we call it like 'Model.populate(options.populate)' from 'paginateHelper.js' and 'path' is 'built-in' mongoose keyword and it tells the 'id' of 'subCategory' and find it where is it, and fetch the full 'document' for it and 'select()' retrieve only the given mentioned data, ie it acts like a 'filter')) 

        }),
        Product.distinct('brand', { isListed: true, ...(genderFilter && { parentCategory: new RegExp(`^${genderFilter}$`, 'i') }) }),  // Here 'distinct()' is the 'built-in' mongoose method used for retrieve 'unique' values and here we retrieve 'unique' 'brand' names and these brand should be 'isListed: true' and if they pass 'genderFilter' value and 'parentCategory' value for 'filtering' we should retrieve 'brand' name, after filtering.
        Banner.find({ placement: 'Home Hero', isActive: true }).sort({ order: 1 }).lean()
    ]);

    const currentDate = new Date();
    
    // FETCH ALL ACTIVE OFFERS
    const activeOffers = await Offer.find({
        startDate: { $lte: currentDate },
        endDate: { $gte: currentDate },
        isManuallyActive: true // Ensure we only get active offers
    }).lean();

    // SEPARATE BUNDLE OFFERS FOR THE HOME PAGE BANNER SECTION
    const bundleOffersRaw = activeOffers.filter(offer => offer.type === 'Fixed Bundle Price');
    
    // Fetch the actual product data for the bundles so we can display their images/names in the UI
    const comboOffers = await Promise.all(bundleOffersRaw.map(async (offer) => {
        const productsInBundle = await Product.find({ 
            _id: { $in: offer.targetIds },
            isListed: true 
        }).select('name variants images').lean(); // Fetching images and variants to show in UI
        
        return {
            ...offer,
            products: productsInBundle
        };
    }));

    // MAP NORMAL OFFERS TO PAGINATED PRODUCTS (Existing Logic)
    const productsWithOffers = paginatedData.results.map(product => {
        let bestOffer = null;
        let maxDiscountAmount = 0;
        const basePrice = product.variants && product.variants.length > 0 ? product.variants[0].price : 0;

        // Filter out the Fixed Bundle Price offers for individual product calculation
        const applicableOffers = activeOffers.filter(offer => {
            if (offer.type === 'Fixed Bundle Price') return false; // Skip bundles for individual cards

            const targets = offer.targetIds.map(id => id.toString());

            if (offer.targetType === 'Specific Product') {
                return targets.includes(product._id.toString());
            } else if (offer.targetType === 'Entire Category') {
                // Safely extract category and ancestor IDs whether they are populated objects or raw strings
                const subCatId = product.subCategory?._id ? product.subCategory._id.toString() : product.subCategory?.toString();
                const categoryIds = [
                    subCatId,
                    ...(product.categoryAncestors || []).map(id => typeof id === 'object' && id !== null ? id._id?.toString() || id.toString() : id?.toString())
                ].filter(Boolean);

                return targets.some(id => categoryIds.includes(id));
            }
            return false;
        });

        // If multiple offers apply, find the most valuable one for the customer
        applicableOffers.forEach(offer => {
            let discountAmount = 0;

            if (offer.type === 'Percentage') {
                discountAmount = basePrice * (offer.discountValue / 100);
            } else if (offer.type === 'Flat Discount') {
                discountAmount = offer.discountValue;
            } else if (offer.type === 'Buy X, Get Y' || offer.type === 'Buy X Get Y') {
                // Calculate estimated value of the BOGO offer to compare against other discounts
                const bQty = offer.buyQuantity || 1;
                const gQty = offer.getQuantity || 1;
                // Value of the free items spread across the total items received
                discountAmount = basePrice * (gQty / (bQty + gQty)); 
            }

            // Allow BOGO to win if it's the only offer, even if basePrice is 0 or there's a tie
            if (discountAmount > maxDiscountAmount || (!bestOffer && discountAmount >= 0)) {
                maxDiscountAmount = discountAmount;
                bestOffer = offer;
            }
        });

        // Convert Mongoose document to plain object if needed, then attach the winning offer
        const productObj = product.toObject ? product.toObject() : product;
        return {
            ...productObj,
            appliedOffer: bestOffer 
        };
    });

    const availableColors = ['Black', 'Blue', 'Red', 'White', 'Green', 'Yellow', 'Pink', 'Grey'];       // Keeping  hardcoded UI options (This is perfectly fine for maintaining a consistent UI sidebar)
    const availableSizes = ['S', 'M', 'L', 'XL', 'XXL'];
    const availableFabrics = ['Cotton', 'Denim', 'Linen', 'Polyester', 'Silk', 'Wool'];

    return {
        products: productsWithOffers, 
        comboOffers, // Pass the extracted combo offers to EJS
        categories: activeCategories,
        availableBrands: availableBrands.filter(Boolean),
        availableColors,
        availableSizes,
        availableFabrics,
        heroBanners,
        totalProducts: paginatedData.totalDocuments,
        totalPages: paginatedData.totalPages,
        currentPage: paginatedData.currentPage,
        searchQuery,
        currentSort: sortOption,
        currentCategory: categoryFilter,
        currentBrand: brandFilter,
        currentColor: colorFilter,
        currentSize: sizeFilter,
        currentFabric: fabricFilter,
        currentMaxPrice: maxPriceFilter,
        currentGender: genderFilter
    };
};

// export const compileShopCatalog = async (queryParams) => {
//     const searchQuery = (queryParams.search || '').trim();
//     const sortOption = queryParams.sort || 'newest';                          // Its value get when 'sort by' section
//     const categoryFilter = queryParams.category || '';                        // Its value(ie an 'ObjectId') get when select 'categories' in home page
//     const brandFilter = queryParams.brand || '';
//     const colorFilter = queryParams.color || '';
//     const sizeFilter = queryParams.size || '';
//     const fabricFilter = queryParams.fabric || '';
//     const maxPriceFilter = Number(queryParams.maxPrice) || SHOP_CONSTANTS.DEFAULT_MAX_PRICE;
//     const page = Math.max(1, Number(queryParams.page) || 1);
//     const limit = SHOP_CONSTANTS.DEFAULT_PAGE_LIMIT;
//     const genderFilter = (queryParams.gender || '').trim();    
//     const categoryQuery = { isListed: true };
//     if (genderFilter) {
//         categoryQuery.gender = new RegExp(`^${genderFilter}$`, 'i');
//     }
//     const activeCategories = await Category.find(categoryQuery).select('_id gender categoryName parentCategory slug').lean();  // 'select()' is the 'built-in 'mongoose' method used for includes and excludes 'fields’(ie ‘.select('_id categoryName gender parentCategory’)’) we want and only used with 'query' methods like 'find()', 'findOne()', or 'findById()'. 
//     const activeCategoryIds = activeCategories.map(item => item._id);    
//     const queryFilter = {
//         isListed: true
//     };    
//     const andConditions = [];    
//     if (activeCategoryIds.length > 0) {   
//         andConditions.push({
//             $or: [
//                 { subCategory: { $in: activeCategoryIds } },                         // Here 'subCategory' is the field name in 'mongodb'(ie created in 'Prodct' model) and we create a 'query' ie checks 'activeCategoryIds' is in 'subCategory' or 'not' and we send this 'query' below(ie 'queryFilter.$and = andConditions' then we send 'queryFilter' with 'paginate()')  
//                 { categoryAncestors: { $in: activeCategoryIds } },
//                 { subCategory: { $exists: false } },
//                 { subCategory: null }
//             ]
//         });
//     }    
//     if (genderFilter) {
//         queryFilter.parentCategory = new RegExp(`^${genderFilter}$`, 'i');          // Here 'queryFilter' object already contains 'isListed: ture' and here we add 'parentCategory' property and if 'gender' is 'Men' then our 'queryFilter' is like '{ isListed: true, parentCategory: 'Men' }'.
//     }     
//     if (categoryFilter) {
//         let targetId = categoryFilter;
//         if (!mongoose.Types.ObjectId.isValid(categoryFilter)) {                    // Here checks 'categoryFilter' is a 'ObjectId' or not, and  if it is not, we 'can' retrieve it based on 'categoryName' or 'slug'. 
//             const foundCat = await productRepository.findCategory(categoryFilter); // It retrieve active 'categories' based on 'categoryName' or 'slug'.
//             targetId = foundCat ? foundCat._id : null;                             // Here value of 'foundCat' is like '{_id: 60c72b2f4f1a2562b8123456}' so here we retrieve just 'value' only. 
//         }
//         if (targetId) {
//             andConditions.push({                                                  // Here 'andConditions' is the 'array' and we just put/push all 'conditions' into it for 'querying' in 'mongodb' later 
//                 $or: [
//                     { categoryAncestors: targetId },                              // Here 'targetId' is the 'ObjectId' of the 'category' that belongs to the product and here we check if this 'targetId' belongs to 'subCategory' or 'categoryAncestors' display all products under that 'targetId' or 'category id'
//                     { subCategory: targetId }
//                 ]
//             });
//         } else {
//             queryFilter._id = null;
//         }
//     }    
//     if (brandFilter) queryFilter.brand = brandFilter;                            // 'queryFilter' is the 'object' that created just above and here we add a 'property' 'brand' and its value 'brandFilter'(ie it captured at top).    
//     if (searchQuery) {
//         const regex = new RegExp(searchQuery, 'i');                             //  Value of 'searchQuery' capture from 'search' bar.
//         andConditions.push({
//             $or: [
//                 { name: regex },                                                // Here value of 'regex' is 'case insensitive' 'searchQuery'(ie it may be 'name', 'brand', 'product' etc put user in 'search' bar).
//                 { productName: regex },
//                 { brand: regex },
//                 { description: regex }
//             ]
//         });
//     }
//     if (colorFilter) andConditions.push({ 'variants.color': { $regex: `^${colorFilter}$`, $options: 'i' } });  // It is for 'color' filter in 'home' page and capture value of 'color'(ie 'colorFilter') above and we add it into 'variants' array as 'color' property(ie 'variants.color') 
//     if (sizeFilter) andConditions.push({ 'variants.size': { $regex: `^${sizeFilter}$`, $options: 'i' } });
//     if (fabricFilter) andConditions.push({ fabric: { $regex: fabricFilter, $options: 'i' } });                 // 'fabric' is 'not' part of 'variants' array.
//     const priceRule = { $lte: maxPriceFilter };                                                                // It is for 'price range' in 'home' page and value 'maxPriceFilter' fixed as '10000' and here we assign value of 'priceRule' as 'less than equal to'(ie '$lte')'10000'.
//     andConditions.push({ 'variants.0.price': priceRule });                                                     // Here '0' represents the 'index' ie 'frst' product/ item and we 'sorting' price range based on first item in 'home' page.                    
//     if (andConditions.length > 0) {
//         queryFilter.$and = andConditions;                                                                      // Here 'queryFilter' is 'object' and 'andConditions' is the 'array of object'(ie 'object' means different conditions like '{"variants.color": {"$regex":"^Blue$","$options":"i"}}' etc) so here we add each 'objects' inside array after '$and:' operator(ie '{"isListed": true, "$and": [{ "variants.color": { "$regex": "^Blue$", "$options": "i" } },.....]}') ie '$and' means 'consider' these condition also.
//     }    
//     let sortConfig = { createdAt: -1 };                                                                        // It is for 'default' date in 'descending order'(ie 'newest' date first) and it is for 'defult' display purpose ie if the user visits the 'home' page 'without' clicking any specific sorting buttons, the database will automatically show them the 'newest arrivals' first.
//     if (sortOption === 'price_asc') sortConfig = { 'variants.0.price': 1 };                                    // Here 'sortOption' data will get from 'req.query.sort' and 'sortConfig' is the 'object' is sort product based on 'descending' order based on created date and 'price_asc' is the 'custom keyword', we send from 'home' page and if it is same(ie 'sortOption === 'alpha_asc')'variants.0.price': value sorted in 'ascending' order(ie ''variants.0.price': 1') otherwise(ie 'price_desc') it will sorted in 'descending' order(ie ''variants.0.price': -1')
//     if (sortOption === 'price_desc') sortConfig = { 'variants.0.price': -1};
//     if (sortOption === 'alpha_asc') sortConfig = { name: 1 };                                                  // Sorts 'name' based on custom word 'alpha_asc'
//     if (sortOption === 'alpha_desc') sortConfig = { name: -1 };
//     const [paginatedData, availableBrands,heroBanners] = await Promise.all([                                              // Here we destructuring the array return by 'Promise.all()' resolved value and 'Promise.all()' only works with 'Promise' objects and almost every 'mongoose' methods(ie  '.find()', '.findOne()', '.countDocuments()', '.save()', '.updateOne()' etc)create a 'Promise' object.
//         paginate(Product, queryFilter, {                                                                      // 'paginate' is the 'custom' function created in 'src/utilities/paginationHelper.js' and used for return value as 'chunks' instead return all data, and we pass '3' arguments in it , 'model'(ie 'Product'), 'query'(ie 'queryFilter')and 'options'(ie query options like 'skip', 'sort', 'limit', 'populate' etc )
//             page,
//             limit,
//             sort: sortConfig,
//             populate: { path: 'subCategory', select: 'categoryName gender slug' },                              // Here 'populate' is the 'argument' and it passes to 'paginate()' function, that is in 'src/utilities/paginateHelper.js' and we call it like 'Model.populate(options.populate)' from 'paginateHelper.js' and 'path' is 'built-in' mongoose keyword and it tells the 'id' of 'subCategory' and find it where is it, and fetch the full 'document' for it and 'select()' retrieve only the given mentioned data, ie it acts like a 'filter')) 
        
//         }),
//         Product.distinct('brand', { isListed: true, ...(genderFilter && { parentCategory: new RegExp(`^${genderFilter}$`, 'i') }) }),  // Here 'distinct()' is the 'built-in' mongoose method used for retrieve 'unique' values and here we retrieve 'unique' 'brand' names and these brand should be 'isListed: true' and if they pass 'genderFilter' value and 'parentCategory' value for 'filtering' we should retrieve 'brand' name, after filtering.
//         Banner.find({ placement: 'Home Hero', isActive: true }).sort({ order: 1 }).lean()
//     ]);
//     const availableColors = ['Black', 'Blue', 'Red', 'White', 'Green', 'Yellow', 'Pink', 'Grey'];       // Keeping  hardcoded UI options (This is perfectly fine for maintaining a consistent UI sidebar)
//     const availableSizes = ['S', 'M', 'L', 'XL', 'XXL'];
//     const availableFabrics = ['Cotton', 'Denim', 'Linen', 'Polyester', 'Silk', 'Wool'];
//     return {
//         products: paginatedData.results,
//         categories: activeCategories,
//         availableBrands: availableBrands.filter(Boolean),
//         availableColors,
//         availableSizes,
//         availableFabrics,
//         heroBanners,
//         totalProducts: paginatedData.totalDocuments,
//         totalPages: paginatedData.totalPages,
//         currentPage: paginatedData.currentPage,
//         searchQuery,
//         currentSort: sortOption,
//         currentCategory: categoryFilter,
//         currentBrand: brandFilter,
//         currentColor: colorFilter,
//         currentSize: sizeFilter,
//         currentFabric: fabricFilter,
//         currentMaxPrice: maxPriceFilter,
//         currentGender: genderFilter
//     };
// };


// For 'retrieve' each product details
export const fetchProductDetails = async (productId) => {
    if (!mongoose.Types.ObjectId.isValid(productId)) {                                                   //  Here checks 'productId' is a 'ObjectId' or not.        
        throw new Error('Invalid Product ID');
    }
    const product = await productRepository.findProduct(productId);                                     // It retrieve product based on 'productId'
    if (product && !product.isListed) {
         logger.warn("4. Product exists but isListed is false!");
    }
    const finalProduct = await productRepository.findProductCategory(productId);                       // It retrieve 'product' based on 'productId' and 'populates' its subCategory.
    if (!finalProduct) {
        throw new Error('Product not found or is unlisted');
    }
    return finalProduct;
};


// For retrieve 'Product' data based on 'subCategoryId', 'excludeProductId', 'isListed: true' etc
export const getRelatedProducts = async (subCategoryId, currentProductId) => {
    return await productRepository.findRelatedProducts(subCategoryId, currentProductId); // Retrieve 'Product' data based on 'subCategoryId', 'excludeProductId', 'isListed: true' etc
};

// For return 'data' about product for 'rating' 
export const prepareProductForRating = async (productId) => {
    if (!mongoose.isValidObjectId(productId)) {                                         // 'Without' this if condition, if anyone type like 'http://localhost:3000/product/rate/hello123'(ie here 'productId' as string ie 'hello123')make 'crash' the application, so here it prevents.
        throw new Error("INVALID_ID");
    }
    const product = await productRepository.findProductByIdLean(productId);             // Retrieve all 'Product' data based on 'prodctId' and 'leaning' for 'display'
    if (!product) {
        throw new Error("NOT_FOUND");
    }
    return {
        productId: product._id,
        name: product.name,
        image: product.images && product.images.length > 0 
            ? product.images[0].url 
            : PRODUCT_CONSTANTS.DEFAULTS.IMAGE,
        quantity: 1, 
    };
};


// For process the data for save 'review' data
export const processAndSaveReview = async (productId, userId, ratingData) => {
    const { rating, message, imageUrl } = ratingData;
    const product = await productRepository.findProductByIdDoc(productId);                // Retrieve all 'Product' data based on 'prodctId'
    if (!product) throw new Error("NOT_FOUND");
    const user = await productRepository.findUserByIdLean(userId);                        // Retrieve 'user' data based on 'userId' and 'leaning'
    const reviewerName = user?.fullName || user?.name || user?.firstName || user?.username || PRODUCT_CONSTANTS.DEFAULTS.REVIEWER_NAME;
    const newReview = {
        user: userId,
        name: reviewerName, 
        rating: Number(rating),
        comment: message,
        image: imageUrl     
    };
    product.reviews.push(newReview);
    product.numReviews = product.reviews.length;
    const totalRating = product.reviews.reduce((acc, item) => item.rating + acc, 0);
    product.rating = totalRating / product.reviews.length;
    await product.save();
    return true;
};

