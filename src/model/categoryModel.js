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
//         required: [true, 'Category name is required'],
//         trim: true
//     },
//     parent: {
//         type: String,
//         required: [true, 'Parent category is required'],
//         enum: ['Men', 'Women', 'Kids', 'Unisex'],       // Matches Figma 'Parent' column
//         default: 'Women'
//     },
//     slug: {
//         type: String,
//         required: true,
//         unique: true,
//         lowercase: true,
//         trim: true
//     },
//     isActive: {
//         type: Boolean,
//         default: true
//     },
//     isDeleted: {
//         type: Boolean,
//         default: false 
//     },
//     productCount: {
//         type: Number,
//         default: 0
//     },
//        description: {
//         type: String,
//         required: true,
//         trim: true
//     },
//     isListed: { 
//         type: Boolean, 
//         default: true 
//     }
// }, { 
//     timestamps: true 
// });
// categorySchema.pre('validate', function(next) {             // Auto-generate slug before saving if not provided
//     if (this.name && !this.slug) {
//         this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
//     }
//     next();
// });

// export default mongoose.model('Category', categorySchema);

