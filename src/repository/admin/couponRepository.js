import Coupon from '../../model/couponModel.js';

export const getPaginatedCoupons = async (skip, limit) => {
    return await Coupon.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
};

export const getTotalCouponsCount = async () => {
    return await Coupon.countDocuments();
};

export const findCouponByCode = async (couponCode) => {
    // Case-insensitive search for uniqueness
    return await Coupon.findOne({ couponCode: { $regex: new RegExp(`^${couponCode}$`, 'i') } });
};

export const createNewCoupon = async (couponData) => {
    const coupon = new Coupon(couponData);
    return await coupon.save();
};

export const findCouponById = async (couponId) => {
    return await Coupon.findById(couponId);
};

export const updateCouponById = async (couponId, updateData) => {
    return await Coupon.findByIdAndUpdate(couponId, { $set: updateData }, { new: true });
};

