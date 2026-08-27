import * as couponService from '../../services/admin/couponService.js';
import { COUPON_MESSAGES } from '../../constants/adminCouponConstants.js';
import * as couponRepository from '../../repository/admin/couponRepository.js'

// For 'display' 'coupon' page
export const loadCouponsPage = async (req, res) => {
    try {
        const dashboardData = await couponService.buildCouponDashboard(req.query.page);  // For 'calculate' the 'coupon' data like 'status'(ie 'expired' or not), 'current page', 'total pages' etc
        res.render('admin/coupon', {
            ...dashboardData,
            layout: 'layout/admin',
            pageTitle: "Coupons Management - Dresson Admin",
            activePage:'coupons',
            error: req.query.error || null,
            success: req.query.success || null
        });
    } catch (error) {
        console.error("Error loading coupons:", error);
        res.status(500).send(COUPON_MESSAGES.INTERNAL_ERROR);
    }
};

// For 'display' 'add coupon' page
export const loadAddCouponPage = async (req, res) => {
    try {
        res.render('admin/addCoupon', {
            layout: 'layout/auth',
            pageTitle: "Add Coupon - Dresson Admin",
            error: null,
            formData: null
        });
    } catch (error) {
        console.error("Error loading add coupon page:", error);
        res.status(500).send(COUPON_MESSAGES.INTERNAL_ERROR);
    }
};

// For process the 'add coupon' page
export const createCoupon = async (req, res) => {
    try {
        await couponService.processAddCoupon(req.body);                                // For 'process' of adding 'coupon' and then 'save' it
        res.redirect('/admin/coupons?success=' + encodeURIComponent(COUPON_MESSAGES.CREATED_SUCCESS));  //  'encodeURIComponent()' is the built-in 'js' function used for 'translates' all space and '&', '?' etc  like symbols into '%20’(ie “Stock Limit Reached” becomes '"Stock%20Limit%20Reached”) because 'url' has strict rule that 'cannot' contain spaces and other characters and later we convert it into 'human readable' messages by using 'decodeURIComponent()’
    } catch (error) {
        console.error("Error creating coupon:", error);
        res.render('admin/addCoupon', {
            layout: 'layout/auth',
            pageTitle: "Add Coupon - Dresson Admin",
            error: error.message || COUPON_MESSAGES.VALIDATION_ERROR,
            formData: req.body 
        });
    }
};


// For 'display' 'edit coupon' page
export const loadEditCouponPage = async (req, res) => {
    try {
        const coupon = await couponRepository.findCouponById(req.params.id);                             // Retrieve coupon based on 'couponId'
        if (!coupon) return res.redirect('/admin/coupons?error=' + encodeURIComponent(COUPON_MESSAGES.NOT_FOUND));
        const formattedCoupon = couponService.formatCouponForEdit(coupon);                               // For 'formatting' the 'coupon' especially its date for display in 'edit' coupon page
        res.render('admin/editCoupon', {
            layout: 'layout/auth',
            pageTitle: "Edit Coupon - Dresson Admin",
            error: null,
            formData: formattedCoupon 
        });
    } catch (error) {
        console.error("Error loading edit coupon page:", error);
        res.redirect('/admin/coupons');
    }
};


// For 'process' the 'editing' of 'coupon'
export const updateCoupon = async (req, res) => {
    try {
        await couponService.processEditCoupon(req.params.id, req.body);                                // For processing the 'coupon edit'
        res.redirect('/admin/coupons?success=' + encodeURIComponent(COUPON_MESSAGES.UPDATED_SUCCESS));
    } catch (error) {
        console.error("Error updating coupon:", error);
        res.render('admin/editCoupon', {
            layout: 'layout/auth',
            pageTitle: "Edit Coupon - Dresson Admin",
            error: error.message || COUPON_MESSAGES.VALIDATION_ERROR,
            formData: { ...req.body, _id: req.params.id } 
        });
    }
};