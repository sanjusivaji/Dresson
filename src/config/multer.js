// src/config/multer.js
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const storageEngine = multer.diskStorage({
    destination: (req, file, cb) => {
        // 1. Set a default fallback directory
        let uploadDirectory = 'public/uploads/misc/';

        // 🧠 2. Check the incoming URL route to pick the perfect folder!
        if (req.originalUrl.includes('/admin')) {
            uploadDirectory = 'public/uploads/products/'; // Admin uploads go here
        } else if (req.originalUrl.includes('/profile')) {
            uploadDirectory = 'public/uploads/profile/';  // User profile avatars go here
        }

        // 3. Automatically build the chosen directory if it doesn't exist
        if (!fs.existsSync(uploadDirectory)) {
            fs.mkdirSync(uploadDirectory, { recursive: true });
        }

        cb(null, uploadDirectory);
    },
    filename: (req, file, cb) => {
        const uniqueKey = Date.now() + '-' + Math.round(Math.random() * 1E9);
        
        // Custom name prefixes based on the route destination
        const filePrefix = req.originalUrl.includes('/admin') ? 'product' : 'avatar';
        
        cb(null, `${filePrefix}-${uniqueKey}${path.extname(file.originalname)}`);
    }
});

// Universal image type filtering guard
const fileFilterConfig = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Invalid asset type. Images only!'), false);
    }
};

const uploadConfig = multer({ 
    storage: storageEngine,
    fileFilter: fileFilterConfig,
    limits: { fileSize: 5 * 1024 * 1024 } // Bumped up to 5MB for high-res admin product images
});

export default uploadConfig;