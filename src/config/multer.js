import multer from 'multer';
import path from 'path';
import fs from 'fs';


const storageEngine = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadDirectory = 'public/uploads/misc/';
        if (req.originalUrl.includes('/admin/product')) {
            uploadDirectory = 'public/uploads/products/';
        } else if (req.originalUrl.includes('/profile')) {
            uploadDirectory = 'public/uploads/profile/';
        }
        if (!fs.existsSync(uploadDirectory)) {
            fs.mkdirSync(uploadDirectory, { recursive: true });
        }
        cb(null, uploadDirectory);
    },
    filename: (req, file, cb) => {
        const uniqueKey = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filePrefix = req.originalUrl.includes('/admin/product') ? 'product' : 'profile';
        cb(null, `${filePrefix}-${uniqueKey}${path.extname(file.originalname)}`);
    }
});


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
    limits: { fileSize: 5 * 1024 * 1024 }
});


export default uploadConfig;