
import User from '../../model/userModel.js';

export const findUserById = async (id) => {
    return await User.findById(id);
};

export const findUserByEmail = async (email) => {
    return await User.findOne({ email });
};

export const updateUserById = async (id, updateFields) => {
    return await User.findByIdAndUpdate(id, { $set: updateFields }, { new: true });
};


export const updateProfileImage = async (userId, newImagePath) => {
    return await User.findByIdAndUpdate(
        userId, 
        { profileImage: newImagePath }, 
        { new: true }
    );
};