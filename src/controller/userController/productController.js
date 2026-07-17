import * as userProductService from '../../services/user/userProductServices.js';

export const getShopPage = async (req, res) => {
    try {
        const catalogData = await userProductService.compileShopCatalog(req.query); //  'compileShopCatalog()' done all 'searching' , filtering etc
        res.render('user/home', {
            ...catalogData,
            query: req.query,
            layout: 'layout/user',     
            pageTitle: "Shop - Dresson"
        });
    } catch (error) {
        console.error("Critical failure executing storefront catalog compilation:", error);
        res.status(500).send("Internal Server Error loading storefront catalog.");
    }
};
