import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    name: { 
        type: String, 
        required: true 
    },
    rating: { 
        type: Number, 
        required: true, 
        min: 1, 
        max: 5 
    },
    comment: { 
        type: String, 
        required: true,
        trim: true 
    }
}, { timestamps: true });

const variantSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true 
    },
    sku: { 
        type: String, 
        required: true, 
        unique: true, 
        trim: true,
        uppercase: true 
    },
    price: { 
        type: Number, 
        required: true, 
        min: 0 
    },
    stock: { 
        type: Number, 
        required: true, 
        min: 0, 
        default: 0 
    }
});

//  Main Product Schema
const productSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true, 
        trim: true 
    },
    brand: { 
        type: String, 
        required: true, 
        trim: true 
    },
    color: { 
        type: String, 
        required: false, 
        trim: true,
        index: true      // Indexed for super-fast sidebar queries
    },
    fabric: { 
        type: String, 
        required: false, 
        default: 'General Blend',
        trim: true,
        index: true
    },

    parentCategory: {
        type: String,
        required: true,
        enum: ['Men', 'Women', 'Kids']
    },
    subCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    categoryAncestors: [{
        type: mongoose.Schema.Types.ObjectId,     // Stores IDs of [Level 4, Level 3, Level 2, Level 1]
        ref: 'Category',
        index: true
    }],   
    description: { 
        type: String, 
        required: true, 
        trim: true 
    },
    images: [{
        url: { type: String, required: true },
        public_id: { type: String, required: true }
    }],
    variants: [variantSchema],

    discount: { 
        type: Number, 
        default: 0, 
        min: 0, 
        max: 99 
    },
    reviews: [reviewSchema], 
    rating: { 
        type: Number, 
        default: 0 
    },
    numReviews: { 
        type: Number, 
        default: 0 
    },

    totalStock: { 
        type: Number, 
        required: true, 
        default: 0 
    },
    isListed: { 
        type: Boolean, 
        default: true 
    }
}, { timestamps: true });

export default mongoose.model('Product', productSchema);
