import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
    couponName: {
        type: String,
        required: true,
        trim: true
    },
    couponCode: {
        type: String,
        required: true,
        unique: true,
        uppercase: true, // Automatically converts codes like "summer50" to "SUMMER50"
        trim: true
    },
    discountType: {
        type: String,
        enum: ['percentage', 'flat'],
        default: 'percentage',
        required: true
    },
    discountValue: {
        type: Number,
        required: true,
        min: 1
    },
    minCartValue: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    maxDiscount: {
        type: Number,
        default: null // Optional: Used to cap percentage discounts (e.g., 50% off UP TO ₹1000)
    },
    validFrom: {
        type: Date,
        required: true
    },
    validTill: {
        type: Date,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true // Automatically adds createdAt and updatedAt fields
});

const Coupon = mongoose.model('Coupon', couponSchema);

export default Coupon;