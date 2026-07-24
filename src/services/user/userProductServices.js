import mongoose from 'mongoose';
import Product from '../../model/productModel.js';
import Category from '../../model/categoryModel.js';
import paginate from '../../utilities/paginationHelper.js'; 
import { SHOP_CONSTANTS } from '../../constants/shopConstants.js'; 

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
    const activeCategoryIds = activeCategories.map(cat => cat._id);
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
            const foundCat = await Category.findOne({
                $or: [{ slug: categoryFilter }, { categoryName: categoryFilter }],
                isListed: true
            }).select('_id').lean();
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
    if (colorFilter) andConditions.push({ 'variants.name': { $regex: colorFilter, $options: 'i' } });
    if (sizeFilter) andConditions.push({ 'variants.name': { $regex: sizeFilter, $options: 'i' } });
    if (fabricFilter) andConditions.push({ 'variants.name': { $regex: fabricFilter, $options: 'i' } });
    const priceRule = { $lte: maxPriceFilter };
    andConditions.push({
        $or: [
            { 'variants.0.price': priceRule },
            { price: priceRule }
        ]
    });
    if (andConditions.length > 0) {
        queryFilter.$and = andConditions;
    }
    let sortConfig = { createdAt: -1 };
    if (sortOption === 'price_asc') sortConfig = { 'variants.0.price': 1, price: 1 };
    if (sortOption === 'price_desc') sortConfig = { 'variants.0.price': -1, price: -1 };
    if (sortOption === 'alpha_asc') sortConfig = { name: 1 };
    if (sortOption === 'alpha_desc') sortConfig = { name: -1 };

    const [paginatedData, availableBrands] = await Promise.all([
        paginate(Product, queryFilter, {
            page,
            limit,
            sort: sortConfig,
            populate: { path: 'subCategory', select: 'categoryName gender slug' }
        }),
        Product.distinct('brand', { isListed: true, ...(genderFilter && { parentCategory: new RegExp(`^${genderFilter}$`, 'i') }) })
    ]);
    const availableColors = ['Black', 'Blue', 'Red', 'White', 'Green', 'Yellow', 'Pink', 'Grey'];
    const availableSizes = ['S', 'M', 'L', 'XL', 'XXL'];
    const availableFabrics = ['Cotton', 'Denim', 'Linen', 'Polyester', 'Silk', 'Wool'];
    return {
        products: paginatedData.results,
        categories: activeCategories,
        availableBrands: availableBrands.filter(Boolean),
        availableColors,
        availableSizes,
        availableFabrics,
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


// For 'retrieve' each product details
export const fetchProductDetails = async (productId) => {
    //console.log("Service received ID:", productId);
    if (!mongoose.Types.ObjectId.isValid(productId)) {
        throw new Error('Invalid Product ID');
    }
    const product = await Product.findById(productId).lean();
    if (product && !product.isListed) {
         console.log("4. Product exists but isListed is false!");
    }
    const finalProduct = await Product.findOne({ 
        _id: productId, 
        isListed: true 
    }).populate('subCategory').lean();
    if (!finalProduct) {
        throw new Error('Product not found or is unlisted');
    }
    return finalProduct;
};



