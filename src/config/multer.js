
import multer from 'multer';
import path from 'path';
import fs from 'fs';
const storageEngine = multer.diskStorage({               // This section tells 'multer' exactly 'where' to save files on server's hard drive and 'how' to 'name' them by using 'multer.diskStorage()'.
    destination: (req, file, cb) => {                    
        let uploadDirectory = 'public/uploads/misc/';
        if (req.originalUrl.includes('/admin/product')) {
            uploadDirectory = 'public/uploads/products/'; // If 'url' contains '/admin' it 'automatically' creates 'uploads/products' folder and it stores 'products' 
        } else if (req.originalUrl.includes('/profile')) {
            uploadDirectory = 'public/uploads/profile/';  // User profile avatars go here
        }
        if (!fs.existsSync(uploadDirectory)) {
            fs.mkdirSync(uploadDirectory, { recursive: true }); // Creates 'folders'(ie 'products' and 'profile' dynamically)
        }
        cb(null, uploadDirectory);                       // 'cb' represents 'call back' passes through argument and 'null' represents 'error'(ie for 'error first callback')and when it calls 'uploadDirectory' 'multer' handle that file.
    },
    filename: (req, file, cb) => {
        const uniqueKey = Date.now() + '-' + Math.round(Math.random() * 1E9);    // Creates 'unique' key to each 'files'(ie 'images')
        const filePrefix = req.originalUrl.includes('/admin/product') ? 'product' : 'profile';        
        cb(null, `${filePrefix}-${uniqueKey}${path.extname(file.originalname)}`);
    }
});
const fileFilterConfig = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {              // It checks 'file.mimetype' is start with the string '/image' or 'not'
        cb(null, true);
    } else {
        cb(new Error('Invalid asset type. Images only!'), false);
    }
};
const uploadConfig = multer({ 
    storage: storageEngine,               // 'storageEngine' creates at 'first'
    fileFilter: fileFilterConfig,         // 'fileFilterConfig' is creates at above
    limits: { fileSize: 5 * 1024 * 1024 } // Bumped up to 5MB for high-res admin product images
});
export default uploadConfig;