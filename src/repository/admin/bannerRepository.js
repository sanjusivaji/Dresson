import Banner from '../../model/bannerModel.js';

// For 'create'  a new 'banner' document
export const createBanner = async (bannerData) => {
    return await Banner.create(bannerData);
};

// Retrieve 'all' banner documents and 'sort' as 'newly created' for 'displaying'(ie 'lean()')it.
export const getAllBanners = async () => {
    return await Banner.find().sort({ createdAt: -1 }).lean(); 
};

//  Retrieve 'all' banner based on 'placement'(ie 'position' like 'Thank you page' etc)and 'sort' based on 'order' in 'ascending' order
export const getActiveBannersByPlacement = async (placement) => {
    return await Banner.find({ placement, isActive: true }).sort({ order: 1 }).lean();
};

// Retrieve banner based on 'id'
export const findBannerById = async (id) => {
    return await Banner.findById(id).lean(); 
};

// Retrieve 'banner' by 'id' and 'delete'  
export const deleteBannerById = async (id) => {
    return await Banner.findByIdAndDelete(id);
};

// Find the 'banner' document based on 'id' and 'update' based on 'updateData' and return this 'updated' document(ie 'new: true')
export const updateBannerById = async (id, updateData) => {
    return await Banner.findByIdAndUpdate(id, updateData, { new: true });
};

// Retrieve first matching document from 'Banner' collection based on 'placement' and 'isActive: true'
export const placementBanner = async(placement) => {
    return await Banner.findOne({placement: placement, isActive: true}).lean()
}