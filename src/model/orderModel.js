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
        variantId: { type: mongoose.Schema.Types.ObjectId, required: false }, 
        variantName: { type: String, required: true },
        variantSku: { type: String, required: true },  
        quantity: { type: Number, required: true, default: 1, min: 1 },
        price: { type: Number, required: true },
        taxRate: { type: Number, required: true, default: 0 },
        comboId: { type: String, default: null },       
        itemStatus: {                                                       // Here 'itemStatus' for individual item/product, so users can 'cancel' like action for 'individual' products.
            type: String, 
            enum: ['Active', 'Cancelled', 'Return Pending', 'Returned','Return Rejected'], 
            default: 'Active' 
        },
        cancellationReason: { type: String },
        returnReason: { type: String },
        adminMessage: { type: String }
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
        enum: ['COD', 'Credit Card', 'Wallet', 'Razorpay', 'razorpay'],     
        required: true
    },
    paymentStatus: { 
        type: String, 
        enum: ['Pending', 'Paid', 'Failed', 'Completed', 'Refunded'], 
        default: 'Pending' 
    },
    razorpayOrderId: {
        type: String,
        default: null
    },
    razorpayPaymentId: {
        type: String,
        default: null
    },
    paymentId: { 
        type: String,
        default: null
    },

   deliveryStatus: {                                                         // Here 'deliveryStatus' we provides for 'overall' 'order' and it helps when 'return' activate only after 'Delivered' the 'order'. 
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