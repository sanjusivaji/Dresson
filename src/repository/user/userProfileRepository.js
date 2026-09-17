
import User from '../../model/userModel.js';


// Retrieve 'user' data based on 'id'
export const findUserById = async (id) => {
    return await User.findById(id);
};


// Retrieve 'user' data based on 'email'
export const findUserByEmail = async (email) => {
    return await User.findOne({ email });
};


// Updating 'user' data based on 'id' based on 'updateFields' and returning 'updated value' into 'document'
export const updateUserById = async (id, updateFields) => {
    return await User.findByIdAndUpdate(id, { $set: updateFields }, { new: true });
};


// Updating 'profileImage' field based on 'userId' and return 'updated' value 
export const updateProfileImage = async (userId, newImagePath) => {
    return await User.findByIdAndUpdate(
        userId, 
        { profileImage: newImagePath }, 
        { new: true }
    );
};