import * as offerRepository from '../../repository/admin/offerRepository.js';
import { PAGINATION } from '../../constants/offerConstants.js';


// Gets a specific page of offers and calculates if they are active, upcoming, or expired based on today's date
export const getOffersList = async (page = 1) => {
    const limit = PAGINATION.OFFERS_PER_PAGE;
    const skip = (page - 1) * limit;    
    const [rawOffers, totalItems] = await Promise.all([
        offerRepository.getPaginatedOffers(skip, limit),
        offerRepository.getTotalOfferCount()
    ]);
    const currentDate = new Date();
    const formattedOffers = rawOffers.map(offer => {
        let currentStatus = 'Active';
        if (new Date(offer.startDate) > currentDate) currentStatus = 'Upcoming';
        if (new Date(offer.endDate) < currentDate) currentStatus = 'Expired';
        return { ...offer, dynamicStatus: currentStatus };
    });
    return {
        offers: formattedOffers,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: parseInt(page)
    };
};



// Grabs the lists of active products and categories to show in the dropdown menus
export const getFormData = async () => {
    const [products, categories] = await Promise.all([
        offerRepository.getActiveProducts(),
        offerRepository.getActiveCategories()
    ]);
    return { products, categories };
};



// Prepares and cleans up the offer data before saving it, ensuring the right products or categories are targeted
const formatOfferData = async (data) => {
    const offerTypeLower = (data.type || '').toLowerCase();
    data.freeTargetIds = [];
    if (offerTypeLower !== 'free shipping') {
        if (data.targetType === 'Entire Category') {
            if (data.categoryId && data.categoryId.startsWith('GENDER_')) {                                                     // Finds all categories under a specific gender (like all Men's clothes) if a broad group is selected
                const selectedGender = data.categoryId.split('_')[1];
                const matchingCategories = await offerRepository.getCategoriesByGender(selectedGender);
                data.targetIds = matchingCategories.map(cat => cat._id);
            } else if (data.categoryId) {
                data.targetIds = [data.categoryId];
            }
        } else if (data.targetType === 'Specific Product') {
            data.targetIds = Array.isArray(data.productId) ? data.productId : [data.productId].filter(Boolean);                // Makes sure single product selections are stored safely as a list
        }
        if (!data.targetIds || data.targetIds.length === 0) {
            throw new Error("TargetSelectionError");
        }
    } else {
        data.targetIds = [];
        if (!data.targetType) data.targetType = 'Entire Order';
    }
    if (offerTypeLower === 'buy x, get y' || offerTypeLower === 'buy x get y') {                                                 // Adjusts the numbers and hides flat discounts if the offer is a "Buy 1 Get 1 Free" style deal
        if (data.freeProductId) {
            data.freeTargetIds = Array.isArray(data.freeProductId) ? data.freeProductId : [data.freeProductId];
        }
        data.buyQuantity = parseInt(data.buyQuantity) || 1;
        data.getQuantity = parseInt(data.getQuantity) || 1;
        data.discountValue = 0;
        data.bundleQuantity = null;
    } else if (offerTypeLower === 'fixed bundle price') {
        data.discountValue = parseFloat(data.discountValue) || 0;
        data.bundleQuantity = data.targetType === 'Entire Category' ? (parseInt(data.bundleQuantity) || 2) : null;
        data.buyQuantity = null;
        data.getQuantity = null;
    } else if (offerTypeLower === 'free shipping') {
        data.discountValue = parseFloat(data.discountValue) || 0;
        data.buyQuantity = null;
        data.getQuantity = null;
        data.bundleQuantity = null;
    } else {
        data.discountValue = parseFloat(data.discountValue) || 0;
        data.buyQuantity = null;
        data.getQuantity = null;
        data.bundleQuantity = null;
    }
    return data;
};



// Validates the dates and prevents duplicate names before creating the new offer
export const createNewOffer = async (data) => {
    const titleRegex = new RegExp('^' + data.title.trim() + '$', 'i');                                                            // Searches for exact matching names ignoring uppercase or lowercase
    const existingOffer = await offerRepository.getOfferByTitleRegex(titleRegex);
    if (existingOffer) throw new Error("DuplicateTitle");
    const formattedData = await formatOfferData(data);
    if (new Date(formattedData.startDate) > new Date(formattedData.endDate)) {
        throw new Error("Start date cannot be after end date.");
    }
    return await offerRepository.createOfferDoc(formattedData);
};



// Gets the offer details along with product/category lists to fill out the edit page
export const getOfferDetailsForEdit = async (offerId) => {
    const offer = await offerRepository.getOfferByIdDoc(offerId);
    if (!offer) return null;
    const { products, categories } = await getFormData();
    const analytics = { redemptions: 0, revenue: 0, avgDiscount: 0 };
    return { offer, products, categories, analytics };
};



// Re-formats the updated data and saves the changes back to an existing offer
export const modifyOffer = async (offerId, updateData) => {
    const formattedData = await formatOfferData(updateData);
    if (formattedData.startDate && formattedData.endDate) {
        if (new Date(formattedData.startDate) > new Date(formattedData.endDate)) {
            throw new Error("Start date cannot be after end date.");
        }
    }
    return await offerRepository.updateOfferDoc(offerId, formattedData);
};



// Instructs the database to delete the offer completely
export const deleteOffer = async (offerId) => {
    return await offerRepository.deleteOfferDoc(offerId);
};