import mongoose from 'mongoose';

const checkoutAddressSnapshotSchema = new mongoose.Schema({
    fullName: String,
    addressLine: String,
    city: String,
    state: String,
    pincode: String,
    phone: String
}, { _id: false }); 

const orderSchema = new mongoose.Schema({
    orderId: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    shippingAddress: checkoutAddressSnapshotSchema,     
    items: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true }, 
        variantName: { type: String, required: true },
        variantSku: { type: String, required: true },  
        quantity: { type: Number, required: true, default: 1, min: 1 },
        price: { type: Number, required: true },
        taxRate: { type: Number, required: true, default: 0 } 
    }],    
    totalAmount: { type: Number, required: true },
    appliedCoupon: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Coupon', 
        default: null 
    },
    discountAmount: { 
        type: Number, 
        default: 0 
    },
    paymentMethod: {
        type: String,
        enum: ['COD', 'Credit Card', 'Wallet', 'Razorpay', 'razorpay'],     // We added lowercase 'razorpay' just to be safe!
        required: true
    },
    paymentStatus: { 
        type: String, 
        enum: ['Pending', 'Paid', 'Failed', 'Completed', 'Refunded'], 
        default: 'Pending' 
    },
   deliveryStatus: {
        type: String,
        enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned'],
        default: 'Pending'
    },
    returnRequest: {
        isRequested: { type: Boolean, default: false },
        reason: { type: String },
        adminMessage: { type: String },
        status: { 
            type: String, 
            enum: ['Pending', 'Approved', 'Rejected', 'Picked Up', 'Refunded'],
            default: 'Pending'
        },
        requestedAt: { type: Date }
    }, 
}, { timestamps: true });

export default mongoose.model('Order', orderSchema);