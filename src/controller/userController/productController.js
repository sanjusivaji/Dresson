import * as userProductService from '../../services/user/userProductServices.js';
import { PRODUCT_CONSTANTS } from '../../constants/userProductConstants.js';


// For display 'home' page
export const getShopPage = async (req, res) => {
    try {
        const catalogData = await userProductService.compileShopCatalog(req.query);
        res.render('user/home', {
            ...catalogData,
            query: req.query,
            layout: 'layout/user',     
            pageTitle: PRODUCT_CONSTANTS.TITLES.SHOP
        });
    } catch (error) {
        console.error("Critical failure executing storefront catalog:", error);
        res.status(500).send(PRODUCT_CONSTANTS.MESSAGES.SERVER_ERROR_CATALOG);
    }
};


export const getProductDetails = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await userProductService.fetchProductDetails(productId);
        if (!product) {
            return res.status(404).render('user/404', {
                layout: 'layout/user',
                pageTitle: PRODUCT_CONSTANTS.TITLES.NOT_FOUND,
                message: PRODUCT_CONSTANTS.MESSAGES.PRODUCT_UNAVAILABLE
            });
        }                
        const relatedProducts = await userProductService.getRelatedProducts(product.subCategory._id, product._id);
        res.render('user/productDetails', {
            product, 
            layout: 'layout/user',
            pageTitle: `${product.name} - Dresson`, 
            activePage: 'shop',
            relatedProducts
        });
    } catch (error) {
        console.error("Critical failure executing product details rendering:", error);
        res.status(500).send(PRODUCT_CONSTANTS.MESSAGES.SERVER_ERROR_DETAILS);
    }
};


// For 'display' 'rate product' page
export const getRateProductPage = async (req, res) => {
    try {
        const productId = req.params.id;
        const isSuccess = req.query.success === 'true';         
        const item = await userProductService.prepareProductForRating(productId);
        res.render('user/rateProduct', {
            layout: 'layout/user',
            pageTitle: PRODUCT_CONSTANTS.TITLES.RATE_PRODUCT,
            item: item,
            successMsg: isSuccess ? PRODUCT_CONSTANTS.MESSAGES.REVIEW_SUCCESS : null 
        });
    } catch (error) {
        console.error("Error loading rate product page:", error.message);
        res.redirect(PRODUCT_CONSTANTS.ROUTES.ORDERS); 
    }
};


// For 'process' of 'rate product'
export const submitProductRating = async (req, res) => {
    try {
        const productId = req.params.id;
        const userId = req.session.user;         
        const ratingData = {
            rating: req.body.rating,
            message: req.body.message,
            imageUrl: req.file ? req.file.url : null
        };
        await userProductService.processAndSaveReview(productId, userId, ratingData);
        res.redirect(`/product/rate/${productId}?success=true`);
    } catch (error) {
        console.error("Error submitting product rating:", error.message);
        res.redirect(PRODUCT_CONSTANTS.ROUTES.ORDERS);
    }
};