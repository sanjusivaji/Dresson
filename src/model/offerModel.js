import mongoose from 'mongoose';
import { OFFER_TYPES } from '../constants/offerConstants.js';

const offerSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        required: true,
        enum: Object.values(OFFER_TYPES)                     // We get 'OFFER_TYPES' from 'src/constans/offerConstants.js' file and its values are 'Percentage', 'Flat Discount' , 'Buyx Get y' etc 
    },
    targetType: {
        type: String,
        required: true,
        enum: ['Specific Product', , 'Entire Category','Entire Order', 'Category']
    },
    targetIds: [{
        type: mongoose.Schema.Types.ObjectId,
    }],
    discountValue: {
        type: Number,
        required: function() {
            return this.type === OFFER_TYPES.PERCENTAGE ||   // Here 'function' become 'required' only when it return 'true' other wise 'not' required so we can provide another options(ie 'discountValue' field is 'not' required for 'BuyX GetY' like fields).
                   this.type === OFFER_TYPES.FLAT_DISCOUNT ||
                   this.type === 'Fixed Bundle Price';
        }
    },
    bundleQuantity: {
        type: Number,
        required: function() {
            return this.type === 'Fixed Bundle Price' && this.targetType === 'Entire Category'; // Here 'function' return 'true' when both(ie 'type' and 'targetType')condition will be satisfy.
        },
        min: [2, 'Bundle must contain at least 2 items']    // Here 'min' is 'built-in' 'mongoose' property used for 'validate' it contains 'minimum' quantity or not and its 'syntax' is 'min:[value, 'Custom Error Message']'(ie if it has 'no' minimum value it return 'error message').
    },
    buyQuantity: {                                          // Here both 'buyQuantity' and 'getQuantity' are belongs to 'Buy X, Get Y' offer
        type: Number,
        required: function() {
            return this.type === 'Buy X, Get Y'; 
        },
        min: [1, 'Buy quantity must be at least 1']
    },
    getQuantity: {
        type: Number,
        required: function() {
            return this.type === 'Buy X, Get Y';
        },
        min: [1, 'Get quantity must be at least 1']
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    isManuallyActive: {
        type: Boolean,
        default: true
    },
    freeTargetIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
}, { timestamps: true });

export default mongoose.model('Offer', offerSchema);