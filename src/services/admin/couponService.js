import * as couponRepository from '../../repository/admin/couponRepository.js';
import { COUPON_CONFIG, COUPON_MESSAGES } from '../../constants/adminCouponConstants.js';

// For 'calculate' the 'coupon' data like 'status'(ie 'expired' or not), 'current page', 'total pages' etc
export const buildCouponDashboard = async (queryPage) => {
    const page = parseInt(queryPage) || 1;
    const limit = COUPON_CONFIG.PAGINATION_LIMIT;
    const skip = (page - 1) * limit;
    const rawCoupons = await couponRepository.getPaginatedCoupons(skip, limit);                // It returns an 'array'(ie because of 'find()')after retrieve 'coupon' documents only for 'necessary' pages by using 'skip' and 'limit' and display 'newly' created first.
    const totalCoupons = await couponRepository.getTotalCouponsCount();                        // Retrieve 'total number' of 'all' coupons
    const currentDate = new Date();
    const formattedCoupons = rawCoupons.map(item => {                                          // Iterate 'coupons'(ie 'rawCoupons')array for check is 'coupon' 'expired' or not and return 'coupon' with its 'status'.
        const isExpired = new Date(item.validTill) < currentDate;
        return {
            ...item,
            calculatedStatus: isExpired ? 'Expired' : (item.isActive ? 'Active' : 'Inactive')
        };
    });
    return {
        coupons: formattedCoupons,
        currentPage: page,
        totalPages: Math.ceil(totalCoupons / limit)
    };
};


// For 'process' of adding 'coupon' and then 'save' it
export const processAddCoupon = async (bodyData) => {
   const { couponName, couponCode, discountType, discountValue, validFrom, validTill, minCartValue, maxDiscount, usageLimitPerUser } = bodyData;
    if (!couponName || !couponCode || !discountValue || !validFrom || !validTill) {
        throw new Error(COUPON_MESSAGES.VALIDATION_ERROR);
    }
    if (new Date(validFrom) >= new Date(validTill)) {
        throw new Error("Expiry date must be after the start date.");
    }
    const existingCoupon = await couponRepository.findCouponByCode(couponCode.trim());   // Retrieve 'one'(ie 'first matching' document) coupon based on 'couponCode'
    if (existingCoupon) {
        throw new Error(COUPON_MESSAGES.CODE_EXISTS);
    }
    const newCouponData = {
        couponName: couponName.trim(),                                                  // All data get through 'argument'.
        couponCode: couponCode.trim().toUpperCase(),
        discountType: discountType || 'percentage',
        discountValue: Number(discountValue),
        minCartValue: Number(minCartValue) || 0,
        maxDiscount: Number(maxDiscount) || null,
        validFrom: new Date(validFrom),
        validTill: new Date(validTill),
        isActive: true,
        usageLimitPerUser: Number(usageLimitPerUser) || 1
    };
    return await couponRepository.createNewCoupon(newCouponData);                       // Create a new 'coupon' document in 'server and then it 'save'(ie we create 'seperate' coupon document each time)
};

// For 'formatting' the 'coupon' especially its date for display in 'edit' coupon page
export const formatCouponForEdit = (coupon) => {
    const formatted = coupon.toObject();
    if (formatted.validFrom) formatted.validFrom = formatted.validFrom.toISOString().split('T')[0];  // Here in 'mongodb' 'date' are stored as 'timestamp' format but in '<input type="date">' when edit time it only accept as 'YYYY-MM-DD'(Eg, '2026-08-22')format.
    if (formatted.validTill) formatted.validTill = formatted.validTill.toISOString().split('T')[0];  // 'toObject()' is the 'built-in' mongoose method used for convert into 'mongoose' document(ie it automatically gets mongoose methods like 'populate()', 'save()' etc) and here if we convert 'coupon' into an 'object'(ie 'coupon.toObject()')we can easily manipulate it without effect the 'coupon' document in 'data base'(other wise the original object effect the changes). toISOString()' is the 'built-in' 'Date' object method in 'js' used for convert a raw date into 'standardized' format Eg, "2026-08-22T11:40:17.000Z" and then we 'splitting' from 'T' letter(ie  'split("T")')and take/return 'only' 'first' part of it(ie '[0]'). 
    return formatted;
};


// For processing the 'coupon edit'
export const processEditCoupon = async (couponId, bodyData) => {
    const { couponName, couponCode, discountType, discountValue, validFrom, validTill, minCartValue, maxDiscount, isActive, usageLimitPerUser } = bodyData;
    if (new Date(validFrom) >= new Date(validTill)) {
        throw new Error("Expiry date must be after the start date.");
    }
    const existingCoupon = await couponRepository.findCouponByCode(couponCode.trim());                // Retrieve coupon based on 'couponId'
    if (existingCoupon && existingCoupon._id.toString() !== couponId.toString()) {                    // Here 'throwing' the 'error' when both 'id' of 'existing' coupon(from 'database') and given 'coupon'(ie through 'argument)are 'not' same, ie editing 'couponId' should be already saved in 'database'.    
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
        isActive: isActive === 'on',
        usageLimitPerUser: Number(usageLimitPerUser) || 1
    };
    return await couponRepository.updateCouponById(couponId, updateData);                             // Find coupon document based on 'couponId' and then 'update' it based on 'updateData' and the changes will return to 'server' by '{new:true}' option.
};