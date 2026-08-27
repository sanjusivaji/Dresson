import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
    couponName: { type: String, required: true, trim: true },
    couponCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    discountType: { type: String, enum: ['percentage', 'flat'], default: 'percentage', required: true },
    discountValue: { type: Number, required: true, min: 1 },
    minCartValue: { type: Number, required: true, default: 0, min: 0 },
    maxDiscount: { type: Number, default: null },
    validFrom: { type: Date, required: true },
    validTill: { type: Date, required: true },
    isActive: { type: Boolean, default: true },

    usageLimitPerUser: { type: Number, default: 1 }, 
    usedBy: [
        {
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            count: { type: Number, default: 0 }
        }
    ]
}, { timestamps: true });

export default mongoose.model('Coupon', couponSchema);