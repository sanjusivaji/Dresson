import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import pkg from 'multer-storage-cloudinary';

const CloudinaryStorage = pkg.CloudinaryStorage || pkg;
dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Storage Configuration for User Avatars (Square 500x500)
const avatarStorage = new CloudinaryStorage({
    cloudinary: { v2: cloudinary }, 
    params: {
        folder: 'dresson_user_avatars',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 500, height: 500, crop: 'limit' }]
    }
});

// Storage Configuration for Product Catalog Gallery
const productStorage = new CloudinaryStorage({
    cloudinary: { v2: cloudinary }, 
    params: {
        folder: 'dresson_products',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ quality: 'auto', fetch_format: 'auto' }]
    }
});

export const uploadAvatar = multer({ storage: avatarStorage });
export const uploadProduct = multer({ storage: productStorage });

export default uploadAvatar;

