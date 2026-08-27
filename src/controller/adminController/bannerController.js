import * as bannerService from '../../services/admin/bannerService.js';
import logger from '../../utilities/logger.js'; 


// For display the 'banner' page
export const getBannersPage = async (req, res) => {
    try {
        const payload = await bannerService.fetchAllBannersForAdmin();                 // Retrieve 'all' banner documents and 'sort' as 'newly created' for 'displaying'(ie 'lean()')it.
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

// For 'Add banner' popup in 'banner' page
export const addBanner = async (req, res) => {
    try {
        await bannerService.processNewBanners(req.body, req.files);                   // For 'process' of create 'new' banner and return a 'resolved' or 'rejected' 'Promise'.
        res.redirect('/admin/banner');
    } catch (error) {
        logger.error("Error adding banner:", error);
        res.status(400).send(error.message); 
    }
};


// For 'edit banner' page
export const getEditBannerPage = async (req, res) => {
    try {
        const bannerId = req.params.id;
        const banner = await bannerService.fetchBannerById(bannerId);                         // Retrieve 'banner' based on 'id'.
        res.render('admin/editBanner', { banner, layout: 'layout/auth' });
    } catch (error) {
        logger.error("Error loading edit banner page:", error);
        res.redirect('/admin/banner'); 
    }
};

// For 'process' of 'edit banner'
export const editBanner = async (req, res) => {
    try {
        const bannerId = req.params.id;
        await bannerService.processEditBanner(bannerId, req.body, req.file);                 // For update new data and 'delete' existing data like image etc from 'aws'
        res.redirect('/admin/banner');
    } catch (error) {
        logger.error("Error updating banner:", error);
        res.status(400).send(error.message); 
    }
};

// For 'process' of 'delete' banner
export const deleteBanner = async (req, res) => {
    try {
        const bannerId = req.params.id;
        await bannerService.removeBanner(bannerId);                                         // For 'delete' old banner from 'awss3' 
        res.status(200).json({ success: true, message: "Banner deleted successfully" });
    } catch (error) {
        logger.error("Error deleting banner:", error);
        res.status(500).json({ success: false, message: "Failed to delete banner" });
    }
};