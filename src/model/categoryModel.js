
import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
    gender: {
        type: String,
        required: true,
        enum: ['Men', 'Women', 'Kids']         
    },
    parentCategory: {
        type: mongoose.Schema.Types.ObjectId,    // Here 'ref' is 'built-in' mongoose keyword used for 'represent' the 'model'(ie 'collection')ie here when we search for 'parentCategory'(ie '.populate('parentCategory')it points 'parentCategory' is in 'category' model and 'type: mongoose.Schema.Types.ObjectId' checks the value of 'parentCategory' is 'ObjectId' and the value of 'ObjectId' should put when create the 'product' 
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
        unique: true, 
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

categorySchema.index({ gender: 1, parentCategory: 1, categoryName: 1 }, { unique: true });   //This is 'compound' indexing(ie 'multiple value' put for indexing)ie it creates an 'index' based on the 'combination' of these '3' fields and 'unique: true' guarantees that 'no' '2' 'documents' can have the exact same combination of those '3' fields ie it allows "Inner wear" under Men AND "Inner wear" under Women, but it 'blocks' again or 'second' document "Inner wear" under 'Men'.

const Category = mongoose.model('Category', categorySchema);

export default Category;




