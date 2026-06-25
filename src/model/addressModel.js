import mongoose from 'mongoose';  // 'mongoose' is '3rd' party 'module' and 'ObjectId' is only in 'mongodb'(but 'string', 'number' etc in 'js' also)and this 'schema'/ 'model' uses in 'js', so we should uses 'mongoose.Schema.Types' with 'ObjectId' for recognise 'js' 

const addressSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    fullName: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    addressLine: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true
    },
    pincode: {
        type: String,
        required: true
    },
    country: {
        type: String,
        required: true
    },

    type: {
        type: String,
        enum: ['HOME', 'WORK', 'OTHER'], 
        default: 'OTHER'
    },
    
    isDefault: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

export default mongoose.model('Address', addressSchema);

