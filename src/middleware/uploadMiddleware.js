import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import pkg from 'multer-storage-cloudinary';
import { S3Client } from '@aws-sdk/client-s3';
import multerS3 from 'multer-s3';

const CloudinaryStorage = pkg.CloudinaryStorage || pkg;
dotenv.config();

// Cloudinary Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// 'AWS S3' Configuration
const s3Config = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_KEY
    }
});

// Storage configuration for 'user profile' image(Square 500x500)
const avatarStorage = new CloudinaryStorage({
    cloudinary: { v2: cloudinary }, 
    params: {
        folder: 'dresson_user_avatars',                                           // Folder created in 'cloudinary' 
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 500, height: 500, crop: 'limit' }]
    }
});

// Storage configuration for 'product' images
const productStorage = new CloudinaryStorage({
    cloudinary: { v2: cloudinary }, 
    params: {
        folder: 'dresson_products',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ quality: 'auto', fetch_format: 'auto' }]
    }
});

// Storage configuration for 'review images'
const reviewStorage = new CloudinaryStorage({
    cloudinary: { v2: cloudinary }, 
    params: {
        folder: 'dresson_reviews',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 800, height: 800, crop: 'limit' }]
    }
});


// AWS S3 Storage for 'banner images'
const awsBannerStorage = multerS3({
    s3: s3Config,
    bucket: process.env.AWS_BUCKET_NAME,                                              // Currently we create a 'S3 bucket' with name 'dresson_banners/2026/' and in 'aws s3' we have 'no' seperate folder instead 'dresson_banner/2026' act as 'parent' folder and if we want any data into it we just add data(ie 'image', 'pdf' etc)after '/'(Eg, 'dresson_banners/2026/summer-sale.jpg'). 
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req, file, cb) {
        cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');  // Except(ie '[^...]')'a to z', '0 to 9' and '-' replace with '_'.
        cb(null, `banners/${uniqueSuffix}-${sanitizedFilename}`);
    }
});

// Image filter validator
const imageFileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files (JPG, PNG, WEBP) are allowed.'), false);
    }
};

// Multer Upload Instances
export const uploadAvatar = multer({ storage: avatarStorage });
export const uploadProduct = multer({ storage: productStorage });
export const uploadReview = multer({ storage: reviewStorage });
export const uploadBanner = multer({ storage: awsBannerStorage, fileFilter: imageFileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

export default uploadAvatar;

