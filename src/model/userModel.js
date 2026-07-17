

import mongoose from 'mongoose';


const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String },
    googleId: {type: String, required: false },
    role: { type: String,default: 'user' },
    isBlocked: {
        type: Boolean,default: false
    },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    status: { type: String, enum: ['Active', 'InActive', 'Blocked'], default: 'Active'  },
    orderCount: { type: Number, default: 0 },

    phone: { type: String, default: 'Not provided' },
    address: { type: String, default: 'Address not updated yet' },
    walletBalance: { type: Number, default: 0 },
    profileImage: { type: String, default: '' },
     avatar: { type: String,},
    avatarId:{type:String,},
    
}, { timestamps: true });

export default mongoose.model('User', userSchema);