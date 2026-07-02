
import Address from '../../model/addressModel.js';

// For retrieve 'address' of each 'user' by their 'userId'
export const findAddressesByUserId = async (userId, skip, limit) => {  // Here we pass 'skip' and 'limit' as argument and 'Address' is the 'model'(but actually we retrieve data from 'addresses' collection)
    return await Address.find({ userId })                              //  Here we sort 'particular' users addresses so we need that 'userId'
        .sort({ isDefault: -1, createdAt: -1 })                        // Here 'isDefault' is 'boolean' and if it is 'true' its value is '1' and if it is 'false' its value is '0' and here it 'sort' in 'descending' order based on 'isDefault'(ie only 'one' address is 'isDefault:true' and 'value' of 'true' is '1' and all other addresses are 'isDefault:false' and it is sorted 'isDefault: -1')and 'createdAt'
        .skip(skip)
        .limit(limit);
};

// For retrieve 'no.of' 'addresses' for 'pagination'
export const countAddressesByUserId = async (userId) => {
    return await Address.countDocuments({ userId });
};

// For retrieve 'one' address id for 'edit' and 'delete' purpose
export const findAddressById = async (addressId) => {
    return await Address.findById(addressId);
};

// For 'edit' address
export const updateAddressById = async (addressId, updateData) => {
    return await Address.findByIdAndUpdate(addressId, { $set: updateData }, { returnDocument: 'after' });  // Here '{returnDocument:'after'}' used for retrieve 'latest' data from data base and we can also use it with 'findOneAndReplace()', 'findOneAndUpdate()' etc and we can use '{ new: true }' instead(same result)
};

// For 'delete' particular address
export const deleteAddressById = async (addressId) => {
    return await Address.findByIdAndDelete(addressId);
};

// For 'create' new address
export const createAddress = async (addressData) => {
    const newAddress = new Address(addressData);      //  Here 'addressData' passes through 'query' and it creates a 'Address' object.
    return await newAddress.save();
};

// For 'remove' 'isDefault:true' status for 'toggle' 'default' purpose
export const clearUserDefaultAddress = async (userId) => {
    return await Address.updateMany({ userId }, { $set: { isDefault: false } });
};

// For 'set' new 'isDefault:true' address
export const setAddressAsDefault = async (addressId) => {
    return await Address.findByIdAndUpdate(addressId, { $set: { isDefault: true } }, { returnDocument: 'after' });  // Here '{returnDocument:'after'}' used for retrieve 'latest' data from data base and we can also use it with 'findOneAndReplace()', 'findOneAndUpdate()' etc and we can use '{ new: true }' instead(same result)
};






