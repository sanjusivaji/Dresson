import * as bannerService from '../../services/admin/bannerService.js';
import logger from '../../utilities/logger.js';


export const getBannersPage = async (req, res) => {
    try {
        const payload = await bannerService.fetchAllBannersForAdmin();
        res.render('admin/banner', { ...payload,
            activePage:'banners',
            layout: 'layout/admin',
            pageTitle: "Banner Management - Dresson Admin"
        });
    } catch (error) {
        logger.error("Error loading banners page:", error);
        res.status(500).send("Internal Server Error loading banners.");
    }
};


//  For 'process' 'add banner'
export const addBanner = async (req, res) => {
    try {
        await bannerService.processNewBanners(req.body, req.files);
        res.redirect('/admin/banner');
    } catch (error) {
        logger.error("Error adding banner:", error);
        res.status(400).send(error.message); 
    }
};


// Shows the page to edit a specific banner
export const getEditBannerPage = async (req, res) => {
    try {
        const bannerId = req.params.id;
        const banner = await bannerService.fetchBannerById(bannerId);
        res.render('admin/editBanner', { banner, layout: 'layout/auth' });
    } catch (error) {
        logger.error("Error loading edit banner page:", error);
        res.redirect('/admin/banner'); 
    }
};


// For 'process' of 'edit' banner
export const editBanner = async (req, res) => {
    try {
        const bannerId = req.params.id;
        await bannerService.processEditBanner(bannerId, req.body, req.file);
        res.redirect('/admin/banner');
    } catch (error) {
        logger.error("Error updating banner:", error);
        res.status(400).send(error.message); 
    }
};


export const deleteBanner = async (req, res) => {
    try {
        const bannerId = req.params.id;
        await bannerService.removeBanner(bannerId);
        res.status(200).json({ success: true, message: "Banner deleted successfully" });
    } catch (error) {
        logger.error("Error deleting banner:", error);
        res.status(500).json({ success: false, message: "Failed to delete banner" });
    }
};