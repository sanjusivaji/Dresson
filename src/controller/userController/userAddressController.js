import logger from '../../utilities/logger.js';
import * as userAddressService from '../../services/user/userAddressService.js';

// For 'display' address page
export const loadAddressPage = async (req, res) => {
    try {
        if (!req.session.user) return res.redirect('/login');   // Checks 'user' loggedIn or not
        const dashboardData = await userAddressService.buildAddressDashboard(req.session.user, req.query.page); // For 'pagination' purpose of each user's addresses
        res.render('user/address', {                            // When 'rendering' time we 'donot' need '/user' because it know 'user/address' is inside 'view' but when 'redirecting' time we should write the 'path'(Eg, '/profile/address'). 
            ...dashboardData,                                   // In 'dashboardData' contains 'addresses' array 'totalPage', 'currentPage' etc  and without 'spread' operator,  without spread, we should write all data inside 'dashboardData' explicitly(ie 'address', 'currentPage' etc) and we should iterate like 'dashboardData.addresses.forEach(item =>{})' instead 'addresses.forEach(item => {})' in 'address.ejs'.
            layout: 'layout/user',                              // For 'layout' 
            pageTitle: "My Address - Dresson",                  // For 'tab title'
            activeSidebar: 'address'                            // For appear 'purple' color on top of side bar 'name'
        });
    } catch (error) {
        logger.error("Error loading address dashboard:", error);
        res.status(500).send("Internal Server Error");
    }
};

// For make the 'address' 'default'
export const setDefaultAddress = async (req, res) => {
    try {
        if (!req.session.user) return res.redirect('/login');     // Ensure is it 'user' or 'not'
        const userId = req.session.user._id || req.session.user;  // '_id' contains in 'req.session.user' but this wrote for some 'safest' thing.)
        await userAddressService.makeAddressDefault(userId, req.params.id);  // 'makeAddressDefault()' call with 'userId' and 'addressId' and it used for 'make' address 'default' 
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
        res.render('user/addAddress', {
            layout: 'layout/user',
            error: errorMessage,                  // It display when 'error' available through 'query parameter'.
            pageTitle: "Add New Address - Dresson",
            activeSidebar: 'address',
            error: null
        });
    } catch (error) {
        logger.error("Error loading add address page:", error);
        res.status(500).send("Internal Server Error");
    }
};

// For 'add' new address
export const processAddAddress = async (req, res) => {
    try {
        if (!req.session.user) return res.redirect('/login');
        await userAddressService.addNewAddress(req.session.user, req.body); // Way of 'Request' data(ie 'req.body')is 'view -> server.js -> middleware -> route -> controller'
        res.redirect('/profile/address'); 
    } catch (error) {
        logger.error("Error saving new address:", error);
        res.render('user/addAddress', {                  // This part for 'processing' 'add Product' page and we 'rendering' the 'profile/address' page in 'catch' block because 'catch' the 'errors' occurs in 'addNewAddress()', and we use 'res.render()' to 'prevent' the user from having to type things 'twice' ie we put 'req.body' inside the object of 'res.render()'(but if we use 'res.redirect()' it goes to that page, but 'not' dispaly the previous data ) and it has all previous data that user input in the form 
            layout: 'layout/user',
            pageTitle: "Add New Address - Dresson",
            activeSidebar: 'address',
            error: error.message || "Failed to save address. Please check your inputs."
        });
    }
};

// For 'display' user's 'edit address' page
export const loadEditAddressPage = async (req, res) => {
    try {
        if (!req.session.user) return res.redirect('/login');
        const address = await userAddressService.prepareEditAddressData(req.session.user, req.params.id); // 'prepareEditAddressData()' return 'address' array 
        res.render('user/editAddress', {
            address,
            layout: 'layout/user',
            pageTitle: "Edit Address - Dresson",
            activeSidebar: 'address',
            error: null
        });
    } catch (error) {
        logger.error("Error loading edit address page:", error);
        res.redirect('/profile/address'); 
    }
};

// For process the 'edit'
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
                isDefault: req.body.isDefault === 'on' || req.body.isDefault === true  // When user 'tick' the 'checkbox' then 'browser' sends the exact text string 'on' to the server and another case during 'fetch()' etc it send 'isDefault: true', so both case value of 'isDefaul' becomes 'true'.
            };
        await userAddressService.updateAddress(userId, addressId, updateData);         // Call the 'updateAddress()' for 'updating' edit data.
        res.redirect('/profile/address');
    } catch (error) {
        console.error("Error updating address:", error);
        res.redirect(`/profile/address/edit/${req.params.id}?error=Failed to update address`);
    }
};

// For 'delete' the 'address'
export const deleteAddress = async (req, res) => {
    try {
        await userAddressService.removeAddress(req.session.user, req.params.id);  // Here 'call' the 'removeAddress' function with 'user' and 'addressId'(ie 'req.params.id')in 'service' folder.
        res.redirect('/profile/address');
    } catch (error) {
        logger.error("Error deleting address:", error);
        res.redirect('/profile/address?error=failed');                           // Here we put the 'query parameter' '?error=failed',after '/profile/address' route
    }
};
