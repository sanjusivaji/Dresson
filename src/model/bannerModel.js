import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema({
    title: { type: String, required: true },
    imageUrl: { type: String, required: true },            // The 'url' created in 'aws' or 'cloudinary'
    targetUrl: { type: String },                           // For 'target' page when 'click' image
    placement: { 
        type: String, 
        enum: ['Home Hero', 'Home Mid', 'Thank You Page', 'Kids Category'], 
        default: 'Home Hero',
        required: true 
    },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 }                   // Useful if we have a slider/carousel of multiple banners!
}, { timestamps: true });

export default mongoose.model('Banner', bannerSchema, 'banners');