import mongoose from 'mongoose';

// 1. Define a clean, static structure for the historical order snapshot
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
        variantName: { type: String, required: true }, // e.g., "Color: Red / Size: L"
        variantSku: { type: String, required: true },  // e.g., "DRSN-TEE-RED-L" - Crucial for inventory updates!
        quantity: { type: Number, required: true, default: 1, min: 1 },
        price: { type: Number, required: true }
    }],
    
    totalAmount: { type: Number, required: true },
    paymentMethod: {
        type: String,
        enum: ['COD', 'UPI', 'Credit Card', 'Wallet'],
        required: true
    },
    paymentStatus: { 
        type: String, 
        enum: ['Pending', 'Paid', 'Failed', 'Refunded'], 
        default: 'Pending' 
    },
    deliveryStatus: { 
        type: String, 
        enum: ['Processing', 'Shipped', 'Delivered', 'Cancelled'], 
        default: 'Processing' 
    }
}, { timestamps: true });

export default mongoose.model('Order', orderSchema);