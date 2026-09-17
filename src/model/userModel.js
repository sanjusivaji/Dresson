import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String },
    googleId: { type: String, required: false },
    role: { type: String, default: 'user' },
    isBlocked: { type: Boolean, default: false },
    email: { type: String, required: true, unique: true },
    normalizedEmail: { type: String, unique: true, sparse: true },     
    password: { type: String },
    status: { type: String, enum: ['Active', 'InActive', 'Blocked'], default: 'Active' },
    orderCount: { type: Number, default: 0 },
    phone: { type: String, default: 'Not provided' },
    address: { type: String, default: 'Address not updated yet' },
    walletBalance: { type: Number, default: 0 },                      
    walletHistory: [{
        amount: { type: Number, required: true },
        type: { type: String, enum: ['credit', 'debit'], required: true },
        description: { type: String, required: true },
        date: { type: Date, default: Date.now }
    }],
    referralCode: { type: String, unique: true, sparse: true },
    profileImage: { type: String, default: '' },
    avatar: { type: String },
    avatarId: { type: String },   
    lastLogin: { type: Date, default: null } 
}, { timestamps: true });

export default mongoose.model('User', userSchema);