import Coupon from '../../model/couponModel.js';

// Retrieve 'coupon' documents only for 'necessary' pages by using 'skip' and 'limit' and display 'newly' created first.
export const getPaginatedCoupons = async (skip, limit) => {
    return await Coupon.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
};

// Retrieve 'total number' of 'all' coupons
export const getTotalCouponsCount = async () => {
    return await Coupon.countDocuments();
};

// Retrieve 'one'(ie 'first matching' document) coupon based on 'couponCode'
export const findCouponByCode = async (couponCode) => {
    return await Coupon.findOne({ couponCode: { $regex: new RegExp(`^${couponCode}$`, 'i') } });
};

// Create a new 'coupon' document in 'server and then it 'save'(ie we create 'seperate' coupon document each time)
export const createNewCoupon = async (couponData) => {
    const coupon = new Coupon(couponData);
    return await coupon.save();
};

// Retrieve coupon based on 'couponId'
export const findCouponById = async (couponId) => {
    return await Coupon.findById(couponId);
};

// Find coupon document based on 'couponId' and then 'update' it based on 'updateData' and the changes will return to 'server' by '{new:true}' option.
export const updateCouponById = async (couponId, updateData) => {
    return await Coupon.findByIdAndUpdate(couponId, { $set: updateData }, { new: true });
};

