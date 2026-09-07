import Offer from '../../model/offerModel.js';
import Product from '../../model/productModel.js';
import Category from '../../model/categoryModel.js';


export const getPaginatedOffers = async (skip, limit) => {
    return await Offer.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec();
};

export const getTotalOfferCount = async () => {
    return await Offer.countDocuments();
};

export const createOfferDoc = async (offerData) => {
    return await Offer.create(offerData);
};

export const getOfferByIdDoc = async (offerId) => {
    return await Offer.findById(offerId).lean().exec();
};

export const updateOfferDoc = async (offerId, updateData) => {
    return await Offer.findByIdAndUpdate(offerId, updateData, { new: true }).exec();
};

export const deleteOfferDoc = async (offerId) => {
    return await Offer.findByIdAndDelete(offerId).exec();
};

export const getOfferByTitleRegex = async (titleRegex) => {
    return await Offer.findOne({ title: { $regex: titleRegex } }).exec();
};


export const getActiveProducts = async () => {
    return await Product.find({ isListed: true }).select('name _id').lean().exec();
};

export const getActiveCategories = async () => {
    return await Category.find({ isListed: true }).select('gender categoryName parentName _id').lean().exec();
};

export const getCategoriesByGender = async (gender) => {
    return await Category.find({ gender: gender, isListed: true }).select('_id').lean().exec();
};

