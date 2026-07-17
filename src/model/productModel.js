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

// 3. Main Product Schema
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
    parentCategory: { 
        type: String, // e.g., Men, Women, Kids
        required: true 
    }, 
    subCategory: { 
        type: mongoose.Schema.Types.ObjectId, // Upgraded to ObjectId for .populate()
        ref: 'Category',
        required: true 
    },   
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
    reviews: [reviewSchema], // Array holding all submitted reviews
    rating: { 
        type: Number, 
        default: 0 // Will store average, e.g., 4.5
    },
    numReviews: { 
        type: Number, 
        default: 0 // Stores total count of reviews
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
