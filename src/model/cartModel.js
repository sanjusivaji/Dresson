import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({      // We replaced it in 'cartSchema'(ie 'items: [cartItemSchema]')in below.
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    variantId: { 
        type: mongoose.Schema.Types.ObjectId, 
        required: true 
    },
    name: { 
        type: String, 
        required: true 
    },
    variantName: {                               // Eg) "M / Black / Cotton"
        type: String, 
        required: true 
    }, 
    sku: { 
        type: String, 
        required: true 
    },
    price: { 
        type: Number, 
        required: true, 
        min: 0 
    },
    taxRate: { 
        type: Number, 
        required: true, 
        default: 0 
    },
    image: { 
        type: String, 
        required: true 
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
        max: 10,
        default: 1
    }
}, { _id: true });

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    items: [cartItemSchema],                        // It created above
    cartTotal: {
        type: Number,
        default: 0
    },
    appliedCoupon: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Coupon', 
        default: null 
    },
    discountAmount: { 
        type: Number, 
        default: 0 
    }
    
}, { timestamps: true });

export default mongoose.model('Cart', cartSchema);