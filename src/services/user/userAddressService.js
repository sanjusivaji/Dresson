import * as addressRepository from '../../repository/user/userAddressRepository.js';       // Here we 'import *' because they export each functions seperately
import { ADDRESS_CONFIG, ADDRESS_TYPES } from '../../constants/userAddressConstants.js';   //  Here we 'import' seperate values(ie 'destructuring') because we need to use each value

// For 'pagination' purpose of each user's addresses
export const buildAddressDashboard = async (userId, queryPage) => {
    const page = parseInt(queryPage) || 1;
    const limit = ADDRESS_CONFIG.PAGINATION_LIMIT || 3;
    const skip = (page - 1) * limit;
    const addresses = await addressRepository.findAddressesByUserId(userId, skip, limit); // Retrieved the particular user's 'addresses' and sorted.
    const totalAddresses = await addressRepository.countAddressesByUserId(userId);        // For 'toal pages'
    return {
        addresses,
        currentPage: page,
        totalPages: Math.ceil(totalAddresses / limit)
    };
};

// For 'make' address 'default'
export const makeAddressDefault = async (userId, addressId) => {
    const address = await addressRepository.findAddressById(addressId);                    // Retrieve 'address' based on 'userId' in 'repository'
    if (!address || address.userId.toString() !== userId.toString()) {
        throw new Error("Address not found or unauthorized");
    }
    await addressRepository.clearUserDefaultAddress(userId,addressId);                     // Remove 'isDefault:true' status
    return await addressRepository.setAddressAsDefault(addressId);                         // Set new 'isDefault:true' address
};

// For 'add'/'create' a new address
export const addNewAddress = async (userId, bodyData) => {
    const { fullName, phone, streetAddress, city, state, pinCode, country, type, isDefault } = bodyData;  
    if(!fullName || typeof fullName !== 'string' || fullName.trim().length < 2){
        throw new Error("Name should have valid text");
    }
     if (!city || typeof city !== 'string' || city.trim().length < 2) {
        throw new Error("City must be a valid text string.");
    }
    if (!state || typeof state !== 'string' || state.trim().length < 2) {   //Must exist, must be text, min 2 chars
        throw new Error("State must be a valid text string.");
    }
    const pinRegex = /^[1-9][0-9]{5}$/;                                     // Exactly 6 digits, cannot start with 0
    if (!pinCode || !pinRegex.test(pinCode.trim())) {
        throw new Error("Please enter a valid 6-digit Pincode.");
    }  
    const isDefaultBool = isDefault === 'on';
    if (isDefaultBool) {
        await addressRepository.clearUserDefaultAddress(userId);           // It makes 'all' previous addresses into 'isDefaul: false', 'only' if condition 'true'(ie if 'user' tick the 'checkbox',then browser sends the exact text 'string: 'on' ie we need to remove all other 'addreses' into 'isDefault:false')
    }
    const addressData = {
        userId,
        fullName: fullName.trim(),
        phone: phone.replace(/[^0-9+]/g, ''),                             // Replaces if the character in 'not'(ie '^' inside '[ ]')'numbers'(ie '0-9') or '+' symbol, with 'empty' string(ie 'delete' it).     
        addressLine: streetAddress.trim(), 
        city: city.trim(),
        state: state.trim(),
        pincode: pinCode.trim(),         
        country: country.trim(),
        type: type || ADDRESS_TYPES.OTHER,
        isDefault: isDefaultBool
    };

    const address = await addressRepository.findAddressesByUserId(userId);
    if(address){
        const checking = address.some(item => {
            return item.addressLine.toLowerCase() === addressData.addressLine.toLowerCase() &&
            item.city.toLocaleLowerCase() === addressData.city.toLowerCase() && 
            item.pincode === addressData.pincode;
        })
        if(checking){
            throw new Error("There are same address existing")
        }
    }

    return await addressRepository.createAddress(addressData);
};



// For 'display' data in 'edit' address
export const prepareEditAddressData = async (userId, addressId) => {  
    const address = await addressRepository.findAddressById(addressId); // Retrieve address based on 'addressId' from 'repository'.
    if (!address || address.userId.toString() !== userId.toString()) {
        throw new Error("Address not found or unauthorized.");
    }
    return address;
};

// For 'update' address in 'edit' 
export const updateAddress = async (userId, addressId, updateData) => {
    const address = await addressRepository.findAddressById(addressId);
    if (!address || address.userId.toString() !== userId.toString()) { // It checks is the 'address' already in database and 'userId' of 'address' in database is same as 'updating' addresses 'userId'. 
        throw new Error("Address not found or unauthorized");
    }
    if (updateData.isDefault === true) {                                // If 'updating' data makes as 'default' by 'user', then it clear all other 'default' address of 'user' based on 'userId'.
        await addressRepository.clearUserDefaultAddress(userId);
    }
    return await addressRepository.updateAddressById(addressId, updateData); // Here 'updateAddressById()' reset(ie '{$set:updateDate' in 'repository')the 'address'.
};

// For 'delete' the address of user
export const removeAddress = async (userId, addressId) => {
    const address = await addressRepository.findAddressById(addressId);  // Retrieve 'address' based on 'addresId' in 'repository'
    if (!address || address.userId.toString() !== userId.toString()) {   // Checks is the 'address' or 'userId' of address is equal to deleting 'userId' that passes through 'POST' request.
        throw new Error("Unauthorized address deletion attempt.");
    }    
    return await addressRepository.deleteAddressById(addressId);
};

