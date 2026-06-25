import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';

dotenv.config();                         // Ensure environment variables are loaded 
cloudinary.config({                      // This tells the Cloudinary SDK exactly which account to send the files to.
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});
const storage = new CloudinaryStorage({  // This acts as the rulebook for how Multer should handle the incoming file.
    cloudinary: cloudinary,
    params: {
        folder: 'dresson_user_avatars', // It creates this neat folder in your Cloudinary dashboard
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'], // reject PDFs or bad file
        transformation: [{ width: 500, height: 500, crop: 'limit' }]   // Automatically resize the image and don't upload massive 10MB camera photos that slow down your site
    }
});

const uploadCloud = multer({ storage: storage });  // Create the actual middleware function

export default uploadCloud;