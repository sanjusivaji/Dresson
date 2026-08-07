import * as userProductService from '../../services/user/userProductServices.js';
import Product from '../../model/productModel.js'


// For display 'home' page
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



// For 'display' 'product details'
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
        const relatedProducts = await Product.find({                                        // Find products in the same subcategory, but exclude the current product being viewed
            subCategory: product.subCategory._id,
            _id: { $ne: product._id }, 
            isListed: true
        })
        .limit(4).lean();
        res.render('user/productDetails', {
            product, 
            layout: 'layout/user',
            pageTitle: `${product.name} - Dresson`, 
            activePage: 'shop',
            relatedProducts
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