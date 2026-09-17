import logger from '../../utilities/logger.js';
import * as userAddressService from '../../services/user/userAddressService.js';
import User from '../../model/userModel.js';


// For 'display' address page
export const loadAddressPage = async (req, res) => {
    try {
        if (!req.session.user) return res.redirect('/login');
        const dashboardData = await userAddressService.buildAddressDashboard(req.session.user, req.query.page);
        res.render('user/address', {
            ...dashboardData,
            layout: 'layout/user',
            pageTitle: "My Address - Dresson",
            activeSidebar: 'address'
        });
    } catch (error) {
        logger.error("Error loading address dashboard:", error);
        res.status(500).send("Internal Server Error");
    }
};


// For make the 'address' 'default'
export const setDefaultAddress = async (req, res) => {
    try {
        if (!req.session.user) return res.redirect('/login');
        const userId = req.session.user._id || req.session.user;
        await userAddressService.makeAddressDefault(userId, req.params.id);
        res.redirect('/profile/address');
    } catch (error) {
        logger.error("Error setting default address:", error);
        res.redirect('/profile/address?error=Failed to set default address');
    }
};


// For 'display' user 'add address' page
export const loadAddAddressPage = async (req, res) => {
    try {
        if (!req.session.user) return res.redirect('/login');
        const errorMessage = req.query.error;
        const returnTo = req.query.returnTo;
        res.render('user/addAddress', {
            layout: 'layout/user',
            error: errorMessage,
            pageTitle: "Add New Address - Dresson",
            activeSidebar: 'address',
            error: null,
            formData: null,
            returnTo: returnTo
        });
    } catch (error) {
        logger.error("Error loading add address page:", error);
        res.status(500).send("Internal Server Error");
    }
};


export const processAddAddress = async (req, res) => {
    try {
        if (!req.session.user) return res.redirect('/login');
        const address = await userAddressService.addNewAddress(req.session.user, req.body);
        if (req.body.returnTo === 'checkout') {
            return res.redirect('/checkout?mode=direct');
        }
        res.redirect('/profile/address');
    } catch (error) {
        logger.error("Error saving new address:", error);
        res.render('user/addAddress', {
            layout: 'layout/user',
            pageTitle: "Add New Address - Dresson",
            activeSidebar: 'address',
            error: error.message || "Failed to save address. Please check your inputs.",
            formData: req.body
        });
    }
};


export const loadEditAddressPage = async (req, res) => {
    try {
        if (!req.session.user) return res.redirect('/login');
        const address = await userAddressService.prepareEditAddressData(req.session.user, req.params.id);
        const returnTo = req.query.returnTo;
        res.render('user/editAddress', {
            address,
            layout: 'layout/user',
            pageTitle: "Edit Address - Dresson",
            activeSidebar: 'address',
            error: null,
            returnTo: returnTo
        });
    } catch (error) {
        logger.error("Error loading edit address page:", error);
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
        if (req.body.returnTo === 'checkout') {
            return res.redirect('/checkout');
        }
        res.redirect('/profile/address');
    } catch (error) {
        console.error("Error updating address:", error);
        res.redirect(`/profile/address/edit/${req.params.id}?error=Failed to update address`);
    }
};


// For 'delete' the 'address'
export const deleteAddress = async (req, res) => {
    try {
        await userAddressService.removeAddress(req.session.user, req.params.id);
        res.redirect('/profile/address');
    } catch (error) {
        logger.error("Error deleting address:", error);
        res.redirect('/profile/address?error=failed');
    }
};


// For checking the 'name' and 'email' is already existed
export const checkNameEmail = async (req, res) => {
    try {
        const { name, email } = req.body;
        if (!name || !email) {
            return res.status(400).json({
                status: false,
                message: "Please input name and email"
            });
        }
        const clearName = name.trim().toLowerCase();
        const clearEmail = email.trim().toLowerCase();
        const nameParts = clearName.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || 'Not Provided';
        const user = await User.findOne({ email: clearEmail });
        if (user) {
            return res.status(409).json({
                success: false,
                message: "User already exist"
            });
        }
        const newUser = new User({
            firstName: firstName,
            lastName: lastName,
            email: clearEmail
        });
        await newUser.save();
        return res.status(201).json({
            status: true,
            message: "Created a new user",
            user: newUser
        });
    } catch (error) {
        console.error("API Crash in checkNameEmail:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};