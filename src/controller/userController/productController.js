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

export const getProductDetails = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await userProductService.fetchProductDetails(productId);
        if (!product) {
            return res.status(404).render('user/404', {
                layout: 'layout/user',
                pageTitle: "Product Not Found - Dresson",
                message: "This apparel unit is no longer available in our active catalog."
            });
        }
        res.render('user/productDetails', {
            product, // Pass the product to the EJS template
            layout: 'layout/user',
            pageTitle: `${product.name} - Dresson`, // Use product.name directly
            activePage: 'shop'
        });

    } catch (error) {
        console.error("Critical failure executing storefront product details rendering:", error);
        if (error.message === 'Product not found or is unlisted') {
            return res.status(404).render('user/404', {
                layout: 'layout/user',
                pageTitle: "Product Not Found",
                message: "This product is unavailable."
            });
        }
        res.status(500).send("Internal Server Error loading product specifications.");
    }
};