import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    variantId: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    variantName: { type: String, required: true }, // e.g., "M / Black / Cotton"
    sku: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, required: true },
    quantity: {
        type: Number,
        required: true,
        min: 1,
        max: 10, // Requirement vi: Maximum quantity limit per order
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
    items: [cartItemSchema],
    cartTotal: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

export default mongoose.model('Cart', cartSchema);