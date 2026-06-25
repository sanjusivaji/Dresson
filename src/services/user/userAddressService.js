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
    const address = await addressRepository.findAddressById(addressId);    // Retrieve 'address' based on 'userId' in 'repository'
    if (!address || address.userId.toString() !== userId.toString()) {
        throw new Error("Address not found or unauthorized");
    }
    await addressRepository.clearUserDefaultAddress(userId);               // Remove 'isDefault:true' status
    return await addressRepository.setAddressAsDefault(addressId);         // Set new 'isDefault:true' address
};

// For 'delete' the address of user
export const removeAddress = async (userId, addressId) => {
    const address = await addressRepository.findAddressById(addressId);  // Retrieve 'address' based on 'addresId' in 'repository'
    if (!address || address.userId.toString() !== userId.toString()) {   // Checks is the 'address' or 'userId' of address is equal to deleting 'userId' that passes through 'POST' request.
        throw new Error("Unauthorized address deletion attempt.");
    }    
    return await addressRepository.deleteAddressById(addressId);
};

// For 'create' a new address
export const addNewAddress = async (userId, bodyData) => {
    const { fullName, phone, streetAddress, city, state, pinCode, country, type, isDefault } = bodyData;    
    const isDefaultBool = isDefault === 'on';
    if (isDefaultBool) {
        await addressRepository.clearUserDefaultAddress(userId);  // It makes 'all' previous addresses into 'isDefaul: false', 'only' if condition 'true'(ie if 'user' tick the 'checkbox',then browser sends the exact text 'string: 'on' ie we need to remove all other 'addreses' into 'isDefault:false')
    }
    const addressData = {
        userId,
        fullName: fullName.trim(),
        phone: phone.replace(/[^0-9+]/g, ''), 
        addressLine: streetAddress.trim(), 
        city: city.trim(),
        state: state.trim(),
        pincode: pinCode.trim(),         
        country: country.trim(),
        type: type || ADDRESS_TYPES.OTHER,
        isDefault: isDefaultBool
    };
    return await addressRepository.createAddress(addressData);
};

// For 'edit' address
export const prepareEditAddressData = async (userId, addressId) => {  
    const address = await addressRepository.findAddressById(addressId); // Retrieve address based on 'addressId' from 'repository'.
    if (!address || address.userId.toString() !== userId.toString()) {
        throw new Error("Address not found or unauthorized.");
    }
    return address;
};




export const updateAddress = async (userId, addressId, updateData) => {
    const address = await addressRepository.findAddressById(addressId);
    if (!address || address.userId.toString() !== userId.toString()) {
        throw new Error("Address not found or unauthorized");
    }
    if (updateData.isDefault === true) {
        await addressRepository.clearUserDefaultAddress(userId);
    }

    return await addressRepository.updateAddressById(addressId, updateData);
};



