import User from '../../model/userModel.js';
import WalletTransaction from '../../model/walletTransactions.js';

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

// For 'retrieve' 'first' matching 'document' in 'user' collection based on 'referral code'
export const findUserByReferralCode = async (referralCode) => {
    return await User.findOne({ referralCode: referralCode.toUpperCase() }); // Assuming your User model is imported as `User`
};

// For 'increase' 'user' 'wallet balance' in 'User' collection
export const creditReferrerWallet = async (userId, amount, textInfo) => {
    const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
            $inc: { walletBalance: amount },
            $push: {
                walletHistory: {
                    amount: amount,
                    type: 'credit',
                    description: textInfo,
                    date: new Date()
                }
            }
        },
        { new: true } 
    );
    if (updatedUser) {
        await WalletTransaction.create({
            user: userId,
            transactionId: `TXN-${crypto.randomUUID()}`, // Completely eliminates unique index collisions
            type: 'Credit',
            adjustmentType: 'Add Funds', 
            description: textInfo, // Covers schemas expecting 'description'
            reason: textInfo,      // Covers schemas expecting 'reason'
            amount: amount,
            balanceBefore: (updatedUser.walletBalance || amount) - amount, // Covers schemas expecting a before state
            balanceAfter: updatedUser.walletBalance || amount, 
            status: 'Success'
        });
    }
    return updatedUser;
};

// For 'credit' and 'create' document user 'wallet transaction'
export const creditNewUserWalletTransaction = async (userId, amount, textInfo) => {
    await WalletTransaction.create({
        user: userId,
        transactionId: `TXN-${crypto.randomUUID()}`, 
        type: 'Credit',
        adjustmentType: 'Add Funds',
        description: textInfo, 
        reason: textInfo,
        amount: amount,
        balanceBefore: 0, 
        balanceAfter: amount, 
        status: 'Success'
    });
};