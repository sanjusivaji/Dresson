import * as couponService from '../../services/admin/couponService.js';
import { COUPON_MESSAGES } from '../../constants/adminCouponConstants.js';
import * as couponRepository from '../../repository/admin/couponRepository.js'

export const loadCouponsPage = async (req, res) => {
    try {
        const dashboardData = await couponService.buildCouponDashboard(req.query.page);

        res.render('admin/coupon', {
            ...dashboardData,
            layout: 'layout/admin',
            pageTitle: "Coupons Management - Dresson Admin",
            activeSidebar: 'coupons',
            error: req.query.error || null,
            success: req.query.success || null
        });
    } catch (error) {
        console.error("Error loading coupons:", error);
        res.status(500).send(COUPON_MESSAGES.INTERNAL_ERROR);
    }
};

export const loadAddCouponPage = async (req, res) => {
    try {
        res.render('admin/addCoupon', {
            layout: 'layout/admin',
            pageTitle: "Add Coupon - Dresson Admin",
            activeSidebar: 'coupons',
            error: null,
            formData: null
        });
    } catch (error) {
        console.error("Error loading add coupon page:", error);
        res.status(500).send(COUPON_MESSAGES.INTERNAL_ERROR);
    }
};

export const createCoupon = async (req, res) => {
    try {
        await couponService.processAddCoupon(req.body);
        res.redirect('/admin/coupons?success=' + encodeURIComponent(COUPON_MESSAGES.CREATED_SUCCESS));
    } catch (error) {
        console.error("Error creating coupon:", error);
        res.render('admin/addCoupon', {
            layout: 'layout/admin',
            pageTitle: "Add Coupon - Dresson Admin",
            activeSidebar: 'coupons',
            error: error.message || COUPON_MESSAGES.VALIDATION_ERROR,
            formData: req.body // Preserve user inputs on error
        });
    }
};


// export const loadAddCouponPage = async (req, res) => {
//     try {
//         res.render('admin/addCoupon', {
//             layout: 'layout/admin',
//             pageTitle: "Add Coupon - Dresson Admin",
//             activeSidebar: 'coupons',
//             error: null,
//             formData: null
//         });
//     } catch (error) {
//         console.error("Error loading add coupon page:", error);
//         res.status(500).send(COUPON_MESSAGES.INTERNAL_ERROR);
//     }
// };

// export const createCoupon = async (req, res) => {
//     try {
//         await couponService.processAddCoupon(req.body);
//         res.redirect('/admin/coupons?success=' + encodeURIComponent(COUPON_MESSAGES.CREATED_SUCCESS));
//     } catch (error) {
//         console.error("Error creating coupon:", error);
//         res.render('admin/addCoupon', {
//             layout: 'layout/admin',
//             pageTitle: "Add Coupon - Dresson Admin",
//             activeSidebar: 'coupons',
//             error: error.message || COUPON_MESSAGES.VALIDATION_ERROR,
//             formData: req.body 
//         });
//     }
// };

// ---- EDIT COUPON ----
export const loadEditCouponPage = async (req, res) => {
    try {
        const coupon = await couponRepository.findCouponById(req.params.id);
        if (!coupon) return res.redirect('/admin/coupons?error=' + encodeURIComponent(COUPON_MESSAGES.NOT_FOUND));

        const formattedCoupon = couponService.formatCouponForEdit(coupon);

        res.render('admin/editCoupon', {
            layout: 'layout/admin',
            pageTitle: "Edit Coupon - Dresson Admin",
            activeSidebar: 'coupons',
            error: null,
            formData: formattedCoupon // Pass existing data to the form
        });
    } catch (error) {
        console.error("Error loading edit coupon page:", error);
        res.redirect('/admin/coupons');
    }
};

export const updateCoupon = async (req, res) => {
    try {
        await couponService.processEditCoupon(req.params.id, req.body);
        res.redirect('/admin/coupons?success=' + encodeURIComponent(COUPON_MESSAGES.UPDATED_SUCCESS));
    } catch (error) {
        console.error("Error updating coupon:", error);
        res.render('admin/editCoupon', {
            layout: 'layout/admin',
            pageTitle: "Edit Coupon - Dresson Admin",
            activeSidebar: 'coupons',
            error: error.message || COUPON_MESSAGES.VALIDATION_ERROR,
            formData: { ...req.body, _id: req.params.id } // Re-populate form with failed data
        });
    }
};