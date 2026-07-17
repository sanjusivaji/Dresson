import Product from '../../model/productModel.js';
import Category from '../../model/categoryModel.js';
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
    const page = Number(queryParams.page) || 1;
    const limit = SHOP_CONSTANTS.DEFAULT_PAGE_LIMIT;

    // 1. EXTRACT GENDER FROM URL HEADER LINK (e.g., ?gender=Men)
    const genderFilter = (queryParams.gender || '').trim();

    // 2. FETCH ONLY RELEVANT SIDEBAR CATEGORIES (FIXED: Avoids ObjectId CastError!)
    const categoryQuery = { isListed: true };
    if (genderFilter) {
        // We strictly query the 'gender' string field on the Category schema
        categoryQuery.gender = new RegExp(`^${genderFilter}$`, 'i');
    }
    
    const activeCategories = await Category.find(categoryQuery).select('_id gender categoryName parentCategory').lean();
    const activeCategoryIds = activeCategories.map(cat => cat._id);

    // 3. BUILD BASE PRODUCT QUERY
    const queryFilter = {
        isListed: true,
        $or: [
            { subCategory: { $in: activeCategoryIds } },
            { subCategory: { $exists: false } },
            { subCategory: null }
        ]
    };

    // --- CRITICAL STEP: CONNECT HEADER GENDER TO MONGODB PRODUCTS ---
    if (genderFilter) {
        // Automatically hides Women's and Kids' clothing when browsing Men!
        queryFilter.parentCategory = new RegExp(`^${genderFilter}$`, 'i');
    }
    // ----------------------------------------------------------------

    // Apply Specific Sub-Category selection
    if (categoryFilter) queryFilter.subCategory = categoryFilter;

    // Apply Brand selection
    if (brandFilter) queryFilter.brand = brandFilter;

    // Apply Search
    if (searchQuery) {
        queryFilter.$and = queryFilter.$and || [];
        queryFilter.$and.push({
            $or: [
                { name: { $regex: searchQuery, $options: 'i' } },
                { productName: { $regex: searchQuery, $options: 'i' } },
                { brand: { $regex: searchQuery, $options: 'i' } },
                { description: { $regex: searchQuery, $options: 'i' } }
            ]
        });
    }

    // Apply Size, Color, or Fabric filter
    if (colorFilter || sizeFilter || fabricFilter) {
        queryFilter.$and = queryFilter.$and || [];
        if (colorFilter) queryFilter.$and.push({ 'variants.name': { $regex: colorFilter, $options: 'i' } });
        if (sizeFilter) queryFilter.$and.push({ 'variants.name': { $regex: sizeFilter, $options: 'i' } });
        if (fabricFilter) queryFilter.$and.push({ 'variants.name': { $regex: fabricFilter, $options: 'i' } });
    }

    // Apply Price Filter
    const priceRule = { $lte: maxPriceFilter };
    queryFilter.$and = queryFilter.$and || [];
    queryFilter.$and.push({
        $or: [
            { 'variants.0.price': priceRule },
            { price: priceRule }
        ]
    });

    // 4. Resolve Sorting
    let sortConfig = { createdAt: -1 };
    if (sortOption === 'price_asc') sortConfig = { 'variants.0.price': 1, price: 1 };
    if (sortOption === 'price_desc') sortConfig = { 'variants.0.price': -1, price: -1 };
    if (sortOption === 'alpha_asc') sortConfig = { name: 1 };
    if (sortOption === 'alpha_desc') sortConfig = { name: -1 };

    // 5. Execute Database Queries in Parallel
    const skip = (page - 1) * limit;
    const [totalProducts, products, availableBrands] = await Promise.all([
        Product.countDocuments(queryFilter),
        Product.find(queryFilter).populate('subCategory', 'categoryName gender').sort(sortConfig).skip(skip).limit(limit).lean(),
        Product.distinct('brand', { isListed: true, ...(genderFilter && { parentCategory: new RegExp(`^${genderFilter}$`, 'i') }) })
    ]);

    // Common standard clothing options for UI dropdowns
    const availableColors = ['Black', 'Blue', 'Red', 'White', 'Green', 'Yellow', 'Pink', 'Grey'];
    const availableSizes = ['S', 'M', 'L', 'XL', 'XXL'];
    const availableFabrics = ['Cotton', 'Denim', 'Linen', 'Polyester', 'Silk', 'Wool'];

    const totalPages = Math.ceil(totalProducts / limit);

    return {
        products,
        categories: activeCategories,
        availableBrands: availableBrands.filter(Boolean),
        availableColors,
        availableSizes,
        availableFabrics,
        totalProducts,
        totalPages,
        currentPage: page,
        searchQuery,
        currentSort: sortOption,
        currentCategory: categoryFilter,
        currentBrand: brandFilter,
        currentColor: colorFilter,
        currentSize: sizeFilter,
        currentFabric: fabricFilter,
        currentMaxPrice: maxPriceFilter,
        
        // REQUIRED BY YOUR HEADER: Tells EJS which gender tab to underline in black!
        currentGender: genderFilter
    };
};