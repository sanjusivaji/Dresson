import mongoose from 'mongoose';

const wishlistSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true,
        unique: true                                 // A user should only have one wishlist document
    },
    products: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Product' 
    }]
}, { timestamps: true });

export default mongoose.model('Wishlist', wishlistSchema);
















// import mongoose from "mongoose";

// const wishlistItemSchema = new mongoose.Schema({
//     productId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "Product",
//         required: true,
//     },
//     variantSku: {
//         type: String,
//         required: true,
//         trim: true
//     }
// }, { _id: true, timestamps: true });

// const wishlistSchema = new mongoose.Schema({
//     userId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "User",
//         required: true,
//         unique: true,
//     },
//     items: [wishlistItemSchema],
// }, { timestamps: true });

// // Updated compound index optimization target mapping paths cleanly
// wishlistSchema.index({ userId: 1, "items.productId": 1, "items.variantSku": 1 });

// export default mongoose.model("Wishlist", wishlistSchema);