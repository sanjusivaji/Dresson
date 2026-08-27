import User from '../../model/userModel.js';

// Retrieve 'first' matching 'user' data from 'User' collection based on 'email'
export const findUserByEmail = async (email) => {
    return await User.findOne({ email });
};

// Retrieve 'user' data by using 'id'
export const findUserById = async (id) => {
    return await User.findById(id);
};

// Create 'user' document based on 'userData' in server and then 'save' it.
export const createNewUser = async (userData) => {
    const newUser = new User(userData);
    return await newUser.save();                                                   // 'save()' is a built-in Mongoose method and it used for 'save' data permanently into 'document'.
};

// Find the 'user' data based on 'id' and updated it based on 'updateFields'
export const updateUserById = async (id, updateFields) => {
    return await User.findByIdAndUpdate(id, { $set: updateFields }, { new: true }); // '{ new: true }' return 'updated' data to 'front end'.
}

// Find 'first' matching 'user' based on 'normalizedEmail'
export const findUserByNormalizedEmail = async (normalizedEmail) => {
    try {
        return await User.findOne({ normalizedEmail: normalizedEmail });
    } catch (error) {
        throw new Error(`Database Error while checking email: ${error.message}`);
    }
};

// For 'adding' 'lastLogin' field into 'user' collection
export const updateLastLogin = async (userId) => {
    return await User.findByIdAndUpdate(userId, { lastLogin: new Date() });
};