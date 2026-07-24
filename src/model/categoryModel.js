
import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
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
    categoryName: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        required: true,
        unique: true, // We keep slugs unique for SEO storefront URLs
        lowercase: true,
        trim: true
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
}, { 
    timestamps: true 
});

categorySchema.index({ gender: 1, parentCategory: 1, categoryName: 1 }, { unique: true });   // This allows "Inner wear" under Men AND "Inner wear" under Women, but blocks you from accidentally creating two "Inner wear" folders inside Men!

const Category = mongoose.model('Category', categorySchema);

export default Category;




