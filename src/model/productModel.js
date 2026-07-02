import mongoose from 'mongoose';

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

// 2. Master Product document schema model mapping
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
        type: String, 
        required: true 
    }, // e.g., Men, Women, Kids
    subCategory: { 
        type: String, 
        required: true 
    },    // e.g., Shirts, Kurtis, Skirts
    description: { 
        type: String, 
        required: true, 
        trim: true 
    },
    images: [{ 
        type: String 
    }], // Stores array strings of media assets filenames/paths
    variants: [variantSchema], // Array injection containing compiled combinations
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

// import mongoose from 'mongoose';

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
//     description: {
//         type: String,
//         required: true,
//         trim: true
//     },
//     category: {
//         type: String, // You can later change this to mongoose.Schema.Types.ObjectId if you make a Category model
//         required: true,
//         trim: true
//     },
//     regularPrice: {
//         type: Number,
//         required: true,
//         min: 0
//     },
//     salePrice: {
//         type: Number,
//         min: 0,
//         default: null // If null, no discount is applied
//     },
//     discountPercent: {
//         type: Number,
//         default: 0 // Calculated automatically or set manually for the "X% Off" badge
//     },
//     quantity: {
//         type: Number,
//         required: true,
//         min: 0,
//         default: 0 // If quantity is 0, frontend automatically displays "Out of Stock"
//     },
//     images: {
//         type: [String], // Array of image file paths or URLs (e.g., ["image1.jpg", "image2.png"])
//         required: true
//     },
//     sizes: {
//         type: [String], // e.g., ["S", "M", "L", "XL"]
//         default: []
//     },
//     colors: {
//         type: [String], // e.g., ["Blue", "Red", "Black"]
//         default: []
//     },
//     fabric: {
//         type: String, // e.g., "Cotton", "Linen", "Polyester"
//         trim: true
//     },
//     ratings: {
//         type: Number,
//         default: 0,
//         min: 0,
//         max: 5
//     },
//     reviewsCount: {
//         type: Number,
//         default: 0
//     },
//     isDeleted: {
//         type: Boolean,
//         default: false // Used for soft deletes so admin doesn't permanently wipe historical order data
//     }
// }, { 
//     timestamps: true // Automatically creates 'createdAt' and 'updatedAt' fields
// });

// // Pre-save middleware to automatically calculate the discount percentage if a salePrice exists
// productSchema.pre('save', function(next) {
//     if (this.salePrice && this.salePrice < this.regularPrice) {
//         this.discountPercent = Math.round(((this.regularPrice - this.salePrice) / this.regularPrice) * 100);
//     } else {
//         this.discountPercent = 0;
//         this.salePrice = null; // Reset if invalid
//     }
//     next();
// });

// const Product = mongoose.model('Product', productSchema);

// export default Product;