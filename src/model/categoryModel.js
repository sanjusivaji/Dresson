// src/model/categoryModel.js
import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
    categoryName: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    gender: {
        type: String,
        required: true,
        enum: ['Men', 'Women', 'Kids']
    },
    parentCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        default: null
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    isListed: { 
        type: Boolean, 
        default: true 
    }
}, { timestamps: true });
categorySchema.index({ categoryName: 1, gender: 1, parentCategory: 1 }, { unique: true });

export default mongoose.model("Category", categorySchema);


// import mongoose from 'mongoose';

// const categorySchema = new mongoose.Schema({
//     categoryName: {
//         type: String,
//         unique: true,
//         required: true
//     },
//     slug: {
//         type: String,
//         required: true,
//         unique: true
//     },
//     description: {
//         type: String,
//         required: true
//     },
//     isActive: {
//         type: Boolean,
//         required: true,
//         default: true
//     },
//     parentCategory: {
//         type: String,
//         required: true,
//         enum: ['Men', 'Women', 'Kids']
//     },
//     offer: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "Offer",
//         default: null
//     },
//     isListed: { 
//         type: Boolean, 
//         default: true 
//     }
// }, { timestamps: true });

// export default mongoose.model("Category", categorySchema);
