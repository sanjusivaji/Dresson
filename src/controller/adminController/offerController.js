import * as offerService from '../../services/admin/offerService.js';
import { OFFER_TYPES, TARGET_TYPES } from '../../constants/offerConstants.js';


export const renderOfferManagement = async (req, res) => {
    try {
        const page = req.query.page || 1;
        const offerData = await offerService.getOffersList(page);       
        res.render('admin/offers', { 
            layout: 'layout/admin',
            pageTitle: 'Offer Management - Admin',
            offers: offerData.offers,
            currentPage: offerData.currentPage,
            totalPages: offerData.totalPages,
            activePage: 'offers' 
        });
    } catch (error) {
        console.error("Error loading offers:", error);
        res.status(500).send("Internal Server Error");
    }
};


export const renderAddOffer = async (req, res) => {
    try {
        const { products, categories } = await offerService.getFormData();
        res.render('admin/addOffer', { 
            title: 'Add Offer',
            offerTypes: Object.values(OFFER_TYPES),
            targetTypes: Object.values(TARGET_TYPES),
            products,
            categories,
            layout: 'layout/admin', 
        });
    } catch (error) {
        console.error("Error loading add offer page:", error);
        res.redirect('/admin/offers');
    }
};


//  For 'process' of 'add offer'
export const processAddOffer = async (req, res) => {
    try {
        await offerService.createNewOffer({ ...req.body });
        res.redirect('/admin/offers'); 
    } catch (error) {
        console.error("Add Offer Error:", error);
        if (error.message === "DuplicateTitle") {
            return res.redirect('/admin/offers/add?error=' + encodeURIComponent('An offer with this title already exists.'));
        }
        res.redirect('/admin/offers/add');
    }
};


export const renderEditOffer = async (req, res) => {
    try {
        const offerId = req.params.id;
        const data = await offerService.getOfferDetailsForEdit(offerId);
        if (!data) return res.redirect('/admin/offers');
        res.render('admin/editOffer', { 
            title: 'Edit Offer',
            layout: 'layout/admin',
            offer: data.offer,
            offerTypes: Object.values(OFFER_TYPES),
            targetTypes: Object.values(TARGET_TYPES),
            products: data.products,
            categories: data.categories,
            analytics: data.analytics 
        });
    } catch (error) {
        console.error("Error loading edit offer page:", error);
        res.redirect('/admin/offers');
    }
};


//  For 'process' of 'edit offer'
export const processEditOffer = async (req, res) => {
    try {
        await offerService.modifyOffer(req.params.id, { ...req.body });       
        res.redirect('/admin/offers');
    } catch (error) {
        console.error("Edit Offer Error:", error);
        res.redirect(`/admin/offers/edit/${req.params.id}`);
    }
};


export const deleteOffer = async (req, res) => {
    try {
        await offerService.deleteOffer(req.params.id);
        const successMsg = encodeURIComponent("The offer has been permanently deleted.");
        res.redirect(`/admin/offers?success=${successMsg}`);
    } catch (error) {
        console.error("Delete Offer Error:", error);
        const errorMsg = encodeURIComponent("Failed to delete the offer. Please try again.");
        res.redirect(`/admin/offers?error=${errorMsg}`);
    }
};