import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({      
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
    variantName: {                               
        type: String, 
        required: true 
    }, 
    sku: {                          // 'sku'(ie 'Stock Keeping Unit')
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
    },
    comboOfferId: {                           // 'comboOfferId' field is good for when 'delete' the combo products(ie we should 'delete' both combo products together)
        type: mongoose.Schema.Types.ObjectId, 
        default: null 
    },
    bogoGroupId: {                            // Links the paid product and the free product together so they delete together
        type: String, 
        default: null 
    },
    isFreeGift: {                             // Tells the frontend to hide the quantity +/- buttons and show ₹0
        type: Boolean, 
        default: false 
    }
}, { _id: true });

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    items: [cartItemSchema],                        
    cartTotal: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

export default mongoose.model('Cart', cartSchema);