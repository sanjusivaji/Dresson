import User from '../../model/userModel.js';

export const findUserByEmail = async (email) => {
    return await User.findOne({ email });
};

export const findUserById = async (id) => {
    return await User.findById(id);
};

export const createNewUser = async (userData) => {
    const newUser = new User(userData);
    return await newUser.save();              // 'save()' is a built-in Mongoose method and it used for 'save' data permanently into 'document'.
};

export const updateUserById = async (id, updateFields) => {
    return await User.findByIdAndUpdate(id, { $set: updateFields }, { new: true }); // '{ new: true }' ensure the the field 'up to date' when changing the field and value.
};