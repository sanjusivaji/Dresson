import mongoose from 'mongoose';
import Product from '../../model/productModel.js';
import Category from '../../model/categoryModel.js';
import paginate from '../../utilities/paginationHelper.js'; 
import { SHOP_CONSTANTS } from '../../constants/shopConstants.js'; 
import * as productRepository from '../../repository/user/userProductRepository.js';
import { PRODUCT_CONSTANTS } from '../../constants/userProductConstants.js';
import Banner from '../../model/bannerModel.js';
import logger from '../../utilities/logger.js'; 
import Offer from '../../model/offerModel.js';


// Gathers all the products, categories, and offers needed to display the main shop page
export const compileShopCatalog = async (queryParams) => {
    const searchQuery = (queryParams.search || '').trim();
    const sortOption = queryParams.sort || 'newest';
    const categoryFilter = queryParams.category || '';
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
    const activeCategories = await Category.find(categoryQuery).select('_id gender categoryName parentCategory slug').lean();
    const activeCategoryIds = activeCategories.map(item => item._id);    
    const queryFilter = {
        isListed: true
    };    
    const andConditions = [];    
    if (activeCategoryIds.length > 0) {   
        andConditions.push({
            $or: [
                { subCategory: { $in: activeCategoryIds } },
                { categoryAncestors: { $in: activeCategoryIds } },
                { subCategory: { $exists: false } },
                { subCategory: null }
            ]
        });
    }    
    if (genderFilter) {
        queryFilter.parentCategory = new RegExp(`^${genderFilter}$`, 'i');
    }     
    if (categoryFilter) {
        let targetId = categoryFilter;
        if (!mongoose.Types.ObjectId.isValid(categoryFilter)) {
            const foundCat = await productRepository.findCategory(categoryFilter);
            targetId = foundCat ? foundCat._id : null;
        }
        if (targetId) {
            andConditions.push({
                $or: [
                    { categoryAncestors: targetId },
                    { subCategory: targetId }
                ]
            });
        } else {
            queryFilter._id = null;
        }
    }    
    if (brandFilter) queryFilter.brand = brandFilter;
    if (searchQuery) {
        const regex = new RegExp(searchQuery, 'i');
        andConditions.push({
            $or: [
                { name: regex },
                { productName: regex },
                { brand: regex },
                { description: regex }
            ]
        });
    }
    if (colorFilter) andConditions.push({ 'variants.color': { $regex: `^${colorFilter}$`, $options: 'i' } });
    if (sizeFilter) andConditions.push({ 'variants.size': { $regex: `^${sizeFilter}$`, $options: 'i' } });
    if (fabricFilter) andConditions.push({ fabric: { $regex: fabricFilter,$options: 'i' } });                 
    const priceRule = { $lte: maxPriceFilter };
    andConditions.push({ 'variants.0.price': priceRule });
    if (andConditions.length > 0) {
        queryFilter.$and = andConditions;
    }    
    let sortConfig = { createdAt: -1 };
    if (sortOption === 'price_asc') sortConfig = { 'variants.0.price': 1 };
    if (sortOption === 'price_desc') sortConfig = { 'variants.0.price': -1};
    if (sortOption === 'alpha_asc') sortConfig = { name: 1 };
    if (sortOption === 'alpha_desc') sortConfig = { name: -1 };
    const [paginatedData, availableBrands,heroBanners] = await Promise.all([
        paginate(Product, queryFilter, {
            page,
            limit,
            sort: sortConfig,
            populate: { path: 'subCategory', select: 'categoryName gender slug' },
        }),
        Product.distinct('brand', { isListed: true, ...(genderFilter && { parentCategory: new RegExp(`^${genderFilter}$`, 'i') }) }),
        Banner.find({ placement: 'Home Hero', isActive: true }).sort({ order: 1 }).lean()
    ]);
    const currentDate = new Date();
    const activeOffers = await Offer.find({
        startDate: { $lte: currentDate },
        endDate: { $gte: currentDate },
        isManuallyActive: true 
    })
    .populate('freeTargetIds', 'name productName images')
    .lean();
    const bundleOffersRaw = activeOffers.filter(offer => offer.type === 'Fixed Bundle Price');
    const comboOffers = await Promise.all(bundleOffersRaw.map(async (offer) => {
        const productsInBundle = await Product.find({ 
            _id: { $in: offer.targetIds },
            isListed: true 
        }).select('name variants images').lean(); 
        return {
            ...offer,
            products: productsInBundle
        };
    }));
    const productsWithOffers = paginatedData.results.map(product => {
        let bestOffer = null;
        const basePrice = product.variants && product.variants.length > 0 ? product.variants[0].price : 0;
        const applicableOffers = activeOffers.filter(offer => {
            if (offer.type === 'Fixed Bundle Price') return false; 
            const targets = offer.targetIds.map(id => id.toString());
            if (offer.targetType === 'Specific Product') {
                return targets.includes(product._id.toString());
            } else if (offer.targetType === 'Entire Category') {
                const subCatId = product.subCategory?._id ? product.subCategory._id.toString() : product.subCategory?.toString();
                const categoryIds = [
                    subCatId,
                    ...(product.categoryAncestors || []).map(id => typeof id === 'object' && id !== null ? id._id?.toString() || id.toString() : id?.toString())
                ].filter(Boolean);
                return targets.some(id => categoryIds.includes(id));
            }
            return false;
        });
        let maxScore = -1;
        applicableOffers.forEach(offer => {
            let score = 0;
            if (offer.type === 'Fixed Bundle Price') {
                score = 50000; 
            } 
            else if (offer.type === 'Buy X, Get Y' || offer.type === 'Buy X Get Y') {
                score = 10000; 
            } 
            else if (offer.type === 'Percentage') {
                score = basePrice * (offer.discountValue / 100); 
            } 
            else if (offer.type === 'Flat Discount') {
                score = offer.discountValue;
            }
            else if (offer.type === 'Free Shipping' || offer.type === 'Free shipping') {
                score = 100; 
            }
            if (score > maxScore) {
                maxScore = score;
                bestOffer = offer;
            }
        });
        const productObj = product.toObject ? product.toObject() : product;
        return {
            ...productObj,
            appliedOffer: bestOffer 
        };
    });
    const availableColors = ['Black', 'Blue', 'Red', 'White', 'Green', 'Yellow', 'Pink', 'Grey'];
    const availableSizes = ['S', 'M', 'L', 'XL', 'XXL'];
    const availableFabrics = ['Cotton', 'Denim', 'Linen', 'Polyester', 'Silk', 'Wool'];
    return {
        products: productsWithOffers, 
        comboOffers, 
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


// Gets the full details for a specific product and calculates its best active offer
export const fetchProductDetails = async (productId) => {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
        throw new Error('Invalid Product ID');
    }
    const product = await productRepository.findProduct(productId);
    if (product && !product.isListed) {
         logger.warn("4. Product exists but isListed is false!");
    }
    const finalProduct = await productRepository.findProductCategory(productId);
    if (!finalProduct) {
        throw new Error('Product not found or is unlisted');
    }
    const currentDate = new Date();
    const activeOffers = await Offer.find({
        startDate: { $lte: currentDate },
        endDate: { $gte: currentDate },
        isManuallyActive: true 
    }).populate('freeTargetIds', 'name productName images').lean();
    let bestOffer = null;
    let maxDiscountAmount = 0;
    const basePrice = finalProduct.variants && finalProduct.variants.length > 0 ? finalProduct.variants[0].price : 0;
    const applicableOffers = activeOffers.filter(offer => {
        if (offer.type === 'Fixed Bundle Price') return false; 
        const targets = offer.targetIds.map(id => id.toString());
        if (offer.targetType === 'Specific Product') {
            return targets.includes(finalProduct._id.toString());
        } else if (offer.targetType === 'Entire Category') {
            const subCatId = finalProduct.subCategory?._id ? finalProduct.subCategory._id.toString() : finalProduct.subCategory?.toString();
            const categoryIds = [
                subCatId,
                ...(finalProduct.categoryAncestors || []).map(id => typeof id === 'object' && id !== null ? id._id?.toString() || id.toString() : id?.toString())
            ].filter(Boolean);
            return targets.some(id => categoryIds.includes(id));
        }
        return false;
    });
    applicableOffers.forEach(offer => {
        let discountAmount = 0;
        if (offer.type === 'Percentage') {
            discountAmount = basePrice * (offer.discountValue / 100);
        } else if (offer.type === 'Flat Discount') {
            discountAmount = offer.discountValue;
        } else if (offer.type === 'Buy X, Get Y' || offer.type === 'Buy X Get Y') {
            const bQty = offer.buyQuantity || 1;
            const gQty = offer.getQuantity || 1;
            discountAmount = basePrice * (gQty / (bQty + gQty)); 
        }
        if (discountAmount > maxDiscountAmount || (!bestOffer && discountAmount >= 0)) {
            maxDiscountAmount = discountAmount;
            bestOffer = offer;
        }
    });
    finalProduct.activeOffer = bestOffer; 
    finalProduct.appliedOffer = bestOffer; 
    return finalProduct;
};


// Finds similar products in the same category to show at the bottom of the page
export const getRelatedProducts = async (subCategoryId, currentProductId) => {
    return await productRepository.findRelatedProducts(subCategoryId, currentProductId);
};


// Prepares the basic info of a product so the user can write a review for it
export const prepareProductForRating = async (productId) => {
    if (!mongoose.isValidObjectId(productId)) {
        throw new Error("INVALID_ID");
    }
    const product = await productRepository.findProductByIdLean(productId);
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


// Saves the user's review and recalculates the product's overall star rating
export const processAndSaveReview = async (productId, userId, ratingData) => {
    const { rating, message, imageUrl } = ratingData;
    const product = await productRepository.findProductByIdDoc(productId);
    if (!product) throw new Error("NOT_FOUND");
    const user = await productRepository.findUserByIdLean(userId);
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