import mongoose from 'mongoose';

// For 'review' schema(later we include it in 'product' schema)
const reviewSchema = new mongoose.Schema({            // Here create a 'schema'(ie 'blueprint' of 'document')   
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true },
    image: { type: String, required: false }
}, { timestamps: true });

// For 'variant' schema(later we include it in 'product' schema)
const variantSchema = new mongoose.Schema({          // We use it in below as 'variants: [variantSchema]'
    name: { 
        type: String, 
        required: true 
    },
    sku: { 
        type: String, 
        required: true, 
        unique: true,                                // 'unique: true' automatically activates 'index' without need of 'index: true'
        trim: true,
        uppercase: true 
    },
    size: {
        type: String, 
        required: false,
        trim: true
    },
    color: { 
        type: String, 
        required: false, 
        trim: true
    },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 }
});

// For 'product' schema
const productSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true },
    fabric: { type: String, default: 'General Blend', trim: true, index: true },
    description: { type: String, required: true, trim: true },
    parentCategory: { type: String, required: true, enum: ['Men', 'Women', 'Kids'] },
    subCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    categoryAncestors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category', index: true }],      // 'categoryAncestors' is the 'array of object' and when we put 'index:true' inside 'array of object' it creates 'multi key indexing' or 'array indexing'(ie each element in the array have 'index' value).
    images: [{
        url: { type: String, required: true },
        public_id: { type: String, required: true }
    }],
    variants: [variantSchema],                                                                       // It tells 'variantSchema' is array of 'sub document' and it created just above.
    reviews: [reviewSchema], 
    rating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },
    totalStock: { type: Number, required: true, default: 0 },
    taxRate: {type: Number,required: true, default: 0},
    isListed: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('Product', productSchema);




















// import mongoose from 'mongoose';

// const reviewSchema = new mongoose.Schema({      // We use it in below as 'variants: [variantSchema]'
//     user: { 
//         type: mongoose.Schema.Types.ObjectId, 
//         ref: 'User', 
//         required: true 
//     },
//     name: { 
//         type: String, 
//         required: true 
//     },
//     rating: { 
//         type: Number, 
//         required: true, 
//         min: 1, 
//         max: 5 
//     },
//     comment: { 
//         type: String, 
//         required: true,
//         trim: true 
//     }
// }, { timestamps: true });

// const variantSchema = new mongoose.Schema({
//     name: { 
//         type: String, 
//         required: true 
//     },
//     sku: { 
//         type: String, 
//         required: true, 
//         unique: true,                             // 'unique: true' automatically activates 'index' without need of 'index: true'
//         trim: true,
//         uppercase: true 
//     },

//     size: {
//         type: String, 
//         required: false,
//         trim: true
//     },
//     color: { 
//         type: String, 
//         required: false, 
//         trim: true
//     },
//     price: { 
//         type: Number, 
//         required: true, 
//         min: 0 
//     },
//     stock: { 
//         type: Number, 
//         required: true, 
//         min: 0, 
//         default: 0 
//     }
// });


// const productSchema = new mongoose.Schema({
//     name: { 
//         type: String, 
//         required: true, 
//         trim: true 
//     },
//     brand: { 
//         type: String, 
//         required: true, 
//         trim: true 
//     },
//     size: {
//         type: String, 
//         required: false,
//         trim: true,
//         index: true
//     },
//     color: { 
//         type: String, 
//         required: false, 
//         trim: true,
//         index: true     
//     },
//     fabric: { 
//         type: String, 
//         required: false, 
//         default: 'General Blend',
//         trim: true,
//         index: true
//     },

//     parentCategory: {
//         type: String,
//         required: true,
//         enum: ['Men', 'Women', 'Kids']
//     },
//     subCategory: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Category',
//         required: true
//     },
//     categoryAncestors: [{
//         type: mongoose.Schema.Types.ObjectId,     // 'categoryAncestors' is the 'array of object' and when we put 'index:true' inside 'array of object' it creates 'multi key indexing' or 'array indexing'(ie each element in the array have 'index' value)
//         ref: 'Category',
//         index: true
//     }],   
//     description: { 
//         type: String, 
//         required: true, 
//         trim: true 
//     },
//     images: [{
//         url: { type: String, required: true },
//         public_id: { type: String, required: true }
//     }],
//     variants: [variantSchema],                // It tells 'variantSchema' is array of 'sub document' and it created just above.

//     discount: { 
//         type: Number, 
//         default: 0, 
//         min: 0, 
//         max: 99 
//     },
//     reviews: [reviewSchema], 
//     rating: { 
//         type: Number, 
//         default: 0 
//     },
//     numReviews: { 
//         type: Number, 
//         default: 0 
//     },

//     totalStock: { 
//         type: Number, 
//         required: true, 
//         default: 0 
//     },
//     isListed: { 
//         type: Boolean, 
//         default: true 
//     }
// }, { timestamps: true });

// export default mongoose.model('Product', productSchema);
