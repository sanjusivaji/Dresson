import User from '../../model/userModel.js';

export const findUserByEmail = async (email) => {
    return await User.findOne({ email });
};

export const findUserById = async (id) => {
    return await User.findById(id);
};

export const createNewUser = async (userData) => {
    const newUser = new User(userData);
    return await newUser.save();
};

export const updateUserById = async (id, updateFields) => {
    return await User.findByIdAndUpdate(id, { $set: updateFields }, { new: true });
};