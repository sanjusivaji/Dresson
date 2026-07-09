
import User from '../../model/userModel.js';

export const findAdminByEmail = async (email, role) => {
    return await User.findOne({ email: email, role: role });
};