import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import pkg from 'multer-storage-cloudinary';

// FIX: This safely handles both versions of the package. 
// If it has a CloudinaryStorage property, it uses it. If not, it uses the package itself!
const CloudinaryStorage = pkg.CloudinaryStorage || pkg;

// Load environment variables
dotenv.config();

// Configure Cloudinary credentials
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Set up the storage engine
const storage = new CloudinaryStorage({
    cloudinary: { v2: cloudinary }, // The magical v2 fix!
    params: {
        folder: 'dresson_user_avatars',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 500, height: 500, crop: 'limit' }]
    }
});

// Initialize Multer with the Cloudinary storage engine
const uploadCloud = multer({ storage: storage });

export default uploadCloud;


// import multer from 'multer';
// import { v2 as cloudinary } from 'cloudinary';
// import dotenv from 'dotenv';
// import { createRequire } from 'module';

// const require = createRequire(import.meta.url);
// const storagePackage = require('multer-storage-cloudinary');
// const CloudinaryStorage = storagePackage.CloudinaryStorage || storagePackage;
// dotenv.config();
// cloudinary.config({
//     cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//     api_key: process.env.CLOUDINARY_API_KEY,
//     api_secret: process.env.CLOUDINARY_API_SECRET
// });

// const storage = new CloudinaryStorage({
//     // cloudinary: cloudinary,
//     cloudinary: { v2: cloudinary },
//     params: {
//         folder: 'dresson_user_avatars',
//         allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
//         transformation: [{ width: 500, height: 500, crop: 'limit' }]
//     }
// });

// const uploadCloud = multer({ storage: storage });

// export default uploadCloud;