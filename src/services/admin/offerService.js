import * as offerRepository from '../../repository/admin/offerRepository.js';
import { PAGINATION } from '../../constants/offerConstants.js';

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


export const getFormData = async () => {
    const [products, categories] = await Promise.all([
        offerRepository.getActiveProducts(),
        offerRepository.getActiveCategories()
    ]);
    return { products, categories };
};

// Internal Helper: Formats the data and maps targets before saving/updating
const formatOfferData = async (data) => {
    const offerTypeLower = (data.type || '').toLowerCase();
    data.freeTargetIds = [];
    if (offerTypeLower !== 'free shipping') {
        if (data.targetType === 'Entire Category') {
            if (data.categoryId && data.categoryId.startsWith('GENDER_')) {
                const selectedGender = data.categoryId.split('_')[1];
                const matchingCategories = await offerRepository.getCategoriesByGender(selectedGender);
                data.targetIds = matchingCategories.map(cat => cat._id);
            } else if (data.categoryId) {
                data.targetIds = [data.categoryId];
            }
        } else if (data.targetType === 'Specific Product') {
            data.targetIds = Array.isArray(data.productId) ? data.productId : [data.productId].filter(Boolean);
        }

        if (!data.targetIds || data.targetIds.length === 0) {
            throw new Error("TargetSelectionError");
        }
    } else {
        data.targetIds = [];
        if (!data.targetType) data.targetType = 'Entire Order';
    }
    if (offerTypeLower === 'buy x, get y' || offerTypeLower === 'buy x get y') {
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

export const createNewOffer = async (data) => {
    // Duplicate check
    const titleRegex = new RegExp('^' + data.title.trim() + '$', 'i');
    const existingOffer = await offerRepository.getOfferByTitleRegex(titleRegex);
    if (existingOffer) throw new Error("DuplicateTitle");

    const formattedData = await formatOfferData(data);

    // Validation
    if (new Date(formattedData.startDate) > new Date(formattedData.endDate)) {
        throw new Error("Start date cannot be after end date.");
    }

    return await offerRepository.createOfferDoc(formattedData);
};


export const getOfferDetailsForEdit = async (offerId) => {
    const offer = await offerRepository.getOfferByIdDoc(offerId);
    if (!offer) return null;
    const { products, categories } = await getFormData();
    const analytics = { redemptions: 0, revenue: 0, avgDiscount: 0 };
    return { offer, products, categories, analytics };
};


export const modifyOffer = async (offerId, updateData) => {
    const formattedData = await formatOfferData(updateData);
    
    if (formattedData.startDate && formattedData.endDate) {
        if (new Date(formattedData.startDate) > new Date(formattedData.endDate)) {
            throw new Error("Start date cannot be after end date.");
        }
    }
    return await offerRepository.updateOfferDoc(offerId, formattedData);
};


export const deleteOffer = async (offerId) => {
    return await offerRepository.deleteOfferDoc(offerId);
};