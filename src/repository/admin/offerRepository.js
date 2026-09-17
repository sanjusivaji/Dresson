import Offer from '../../model/offerModel.js';
import Product from '../../model/productModel.js';
import Category from '../../model/categoryModel.js';


// Gets a limited list of offers sorted by newest first for the admin table
export const getPaginatedOffers = async (skip, limit) => {
    return await Offer.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec();
};



// Counts exactly how many offers exist in total
export const getTotalOfferCount = async () => {
    return await Offer.countDocuments();
};



// Creates and saves a brand new offer document into the database
export const createOfferDoc = async (offerData) => {
    return await Offer.create(offerData);
};



// Finds a specific offer document using its unique ID
export const getOfferByIdDoc = async (offerId) => {
    return await Offer.findById(offerId).lean().exec();
};



// Updates the details of an existing offer document
export const updateOfferDoc = async (offerId, updateData) => {
    return await Offer.findByIdAndUpdate(offerId, updateData, { new: true }).exec();
};



// Permanently deletes an offer document from the database
export const deleteOfferDoc = async (offerId) => {
    return await Offer.findByIdAndDelete(offerId).exec();
};



// Searches for an offer by its title to prevent duplicate names
export const getOfferByTitleRegex = async (titleRegex) => {
    return await Offer.findOne({ title: { $regex: titleRegex } }).exec();
};



// Gets a list of all products that are currently visible to customers
export const getActiveProducts = async () => {
    return await Product.find({ isListed: true }).select('name _id').lean().exec();
};



// Gets a list of all categories that are currently visible to customers
export const getActiveCategories = async () => {
    return await Category.find({ isListed: true }).select('gender categoryName parentName _id').lean().exec();
};



// Gets all categories that belong to a specific gender group like 'Men' or 'Women'
export const getCategoriesByGender = async (gender) => {
    return await Category.find({ gender: gender, isListed: true }).select('_id').lean().exec();
};