import logger from '../../utilities/logger.js';
import * as userAddressService from '../../services/user/userAddressService.js';

// For 'display' address page
export const loadAddressPage = async (req, res) => {
    try {
        if (!req.session.user) return res.redirect('/login');   // Checks 'user' loggedIn or not
        const dashboardData = await userAddressService.buildAddressDashboard(req.session.user, req.query.page); // For 'pagination' purpose of each user's addresses
        res.render('user/address', {
            ...dashboardData,
            layout: 'layout/user',                              // For 'layout' 
            pageTitle: "My Address - Dresson",                  // For 'tab title'
            activeSidebar: 'address'                            // For appear 'purple' color on top of side bar name
        });
    } catch (error) {
        logger.error("Error loading address dashboard:", error);
        res.status(500).send("Internal Server Error");
    }
};


export const setDefaultAddress = async (req, res) => {
    try {
        if (!req.session.user) return res.redirect('/login');

        const userId = req.session.user._id || req.session.user; // Make sure we get correct ID

        await userAddressService.makeAddressDefault(userId, req.params.id);
        
        // Force fresh data
        res.redirect('/profile/address');
    } catch (error) {
        logger.error("Error setting default address:", error);
        res.redirect('/profile/address?error=Failed to set default address');
    }
};




export const deleteAddress = async (req, res) => {
    try {
        await userAddressService.removeAddress(req.session.user, req.params.id);
        res.redirect('/profile/address');
    } catch (error) {
        logger.error("Error deleting address:", error);
        res.redirect('/profile/address?error=failed');
    }
};

export const loadAddAddressPage = async (req, res) => {
    try {
        if (!req.session.user) return res.redirect('/login');

        res.render('user/addAddress', {
            layout: 'layout/user',
            pageTitle: "Add New Address - Dresson",
            activeSidebar: 'address',
            error: null
        });
    } catch (error) {
        console.error("Error loading add address page:", error);
        res.status(500).send("Internal Server Error");
    }
};
export const processAddAddress = async (req, res) => {
    try {
        if (!req.session.user) return res.redirect('/login');

        await userAddressService.addNewAddress(req.session.user, req.body);
        res.redirect('/profile/address'); 
    } catch (error) {
        console.error("Error saving new address:", error);
        res.render('user/addAddress', {
            layout: 'layout/user',
            pageTitle: "Add New Address - Dresson",
            activeSidebar: 'address',
            error: error.message || "Failed to save address. Please check your inputs."
        });
    }
};

export const loadEditAddressPage = async (req, res) => {
    try {
        if (!req.session.user) return res.redirect('/login');

        const address = await userAddressService.prepareEditAddressData(req.session.user, req.params.id);

        res.render('user/editAddress', {
            address,
            layout: 'layout/user',
            pageTitle: "Edit Address - Dresson",
            activeSidebar: 'address',
            error: null
        });
    } catch (error) {
        console.error("Error loading edit address page:", error);
        res.redirect('/profile/address'); 
    }
};


export const processEditAddress = async (req, res) => {
    try {
        if (!req.session.user) return res.redirect('/login');

        const userId = req.session.user._id || req.session.user;
        const addressId = req.params.id;
            const updateData = {
                fullName: req.body.fullName,
                phone: req.body.phone,
                addressLine: req.body.streetAddress,
                city: req.body.city,
                state: req.body.state,
                pincode: req.body.pinCode,         
                country: req.body.country,
                type: req.body.type,
                isDefault: req.body.isDefault === 'on' || req.body.isDefault === true
            };
        await userAddressService.updateAddress(userId, addressId, updateData);

        res.redirect('/profile/address');
    } catch (error) {
        console.error("Error updating address:", error);
        res.redirect(`/profile/address/edit/${req.params.id}?error=Failed to update address`);
    }
};


