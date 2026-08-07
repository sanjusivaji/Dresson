import * as couponRepository from '../../repository/admin/couponRepository.js';
import { COUPON_CONFIG, COUPON_MESSAGES } from '../../constants/adminCouponConstants.js';

// For 'build' coupon dash board
export const buildCouponDashboard = async (queryPage) => {
    const page = parseInt(queryPage) || 1;
    const limit = COUPON_CONFIG.PAGINATION_LIMIT;
    const skip = (page - 1) * limit;
    const rawCoupons = await couponRepository.getPaginatedCoupons(skip, limit);
    const totalCoupons = await couponRepository.getTotalCouponsCount();
    const currentDate = new Date();
    const formattedCoupons = rawCoupons.map(coupon => {
        const isExpired = new Date(coupon.validTill) < currentDate;
        return {
            ...coupon,
            calculatedStatus: isExpired ? 'Expired' : (coupon.isActive ? 'Active' : 'Inactive')
        };
    });
    return {
        coupons: formattedCoupons,
        currentPage: page,
        totalPages: Math.ceil(totalCoupons / limit)
    };
};



export const processAddCoupon = async (bodyData) => {
    const { couponName, couponCode, discountType, discountValue, validFrom, validTill, minCartValue, maxDiscount } = bodyData;
    if (!couponName || !couponCode || !discountValue || !validFrom || !validTill) {
        throw new Error(COUPON_MESSAGES.VALIDATION_ERROR);
    }
    if (new Date(validFrom) >= new Date(validTill)) {
        throw new Error("Expiry date must be after the start date.");
    }
    const existingCoupon = await couponRepository.findCouponByCode(couponCode.trim());
    if (existingCoupon) {
        throw new Error(COUPON_MESSAGES.CODE_EXISTS);
    }
    const newCouponData = {
        couponName: couponName.trim(),
        couponCode: couponCode.trim().toUpperCase(),
        discountType: discountType || 'percentage',
        discountValue: Number(discountValue),
        minCartValue: Number(minCartValue) || 0,
        maxDiscount: Number(maxDiscount) || null,
        validFrom: new Date(validFrom),
        validTill: new Date(validTill),
        isActive: true
    };
    return await couponRepository.createNewCoupon(newCouponData);
};


export const formatCouponForEdit = (coupon) => {
    const formatted = coupon.toObject();
    if (formatted.validFrom) formatted.validFrom = formatted.validFrom.toISOString().split('T')[0];
    if (formatted.validTill) formatted.validTill = formatted.validTill.toISOString().split('T')[0];
    return formatted;
};



export const processEditCoupon = async (couponId, bodyData) => {
    const { couponName, couponCode, discountType, discountValue, validFrom, validTill, minCartValue, maxDiscount, isActive } = bodyData;
    if (new Date(validFrom) >= new Date(validTill)) {
        throw new Error("Expiry date must be after the start date.");
    }
    const existingCoupon = await couponRepository.findCouponByCode(couponCode.trim());
    if (existingCoupon && existingCoupon._id.toString() !== couponId.toString()) {                    // Ensure the found coupon is not the one we are currently editing
        throw new Error(COUPON_MESSAGES.CODE_EXISTS);
    }
    const updateData = {
        couponName: couponName.trim(),
        couponCode: couponCode.trim().toUpperCase(),
        discountType: discountType || 'percentage',
        discountValue: Number(discountValue),
        minCartValue: Number(minCartValue) || 0,
        maxDiscount: maxDiscount ? Number(maxDiscount) : null,
        validFrom: new Date(validFrom),
        validTill: new Date(validTill),
        isActive: isActive === 'on'
    };
    return await couponRepository.updateCouponById(couponId, updateData);
};