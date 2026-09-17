import * as bannerRepository from '../../repository/admin/bannerRepository.js';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';


// Gets all the banners to show on the admin page
export const fetchAllBannersForAdmin = async () => {
    const banners = await bannerRepository.getAllBanners();
    return { banners };
};


// Saves a newly uploaded banner and its images
export const processNewBanners = async (bodyData, filesData) => {
    if (!filesData || filesData.length === 0) {
        throw new Error("At least one banner image file is required.");
    }
    if (filesData.length > 5) {
        throw new Error("You can only upload a maximum of 5 images at once.");
    } 
    const bannerPromises = filesData.map(item => {
        const bannerData = {
            title: bodyData.title.trim(),
            targetUrl: bodyData.targetUrl ? bodyData.targetUrl.trim() : '',
            placement: bodyData.placement,
            isActive: bodyData.isActive === 'on',
            imageUrl: item.location || item.path 
        };
        return bannerRepository.createBanner(bannerData);
    });
    return await Promise.all(bannerPromises);
};


// Finds a specific banner using its ID number
export const fetchBannerById = async (id) => {
    const banner = await bannerRepository.findBannerById(id);
    if (!banner) {
        throw new Error("Banner not found");
    }
    return banner;
};


const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_KEY
    }
});


// Updates banner text, and replaces the image if a new one is provided
export const processEditBanner = async (id, bodyData, fileData) => {
    const existingBanner = await bannerRepository.findBannerById(id);
    if (!existingBanner) {
        throw new Error("Banner not found.");
    }
    const updateData = {
        title: bodyData.title.trim(),
        targetUrl: bodyData.targetUrl ? bodyData.targetUrl.trim() : '',
        placement: bodyData.placement,
        isActive: bodyData.isActive === 'on'
    };
    if (fileData && fileData.location) {
        updateData.imageUrl = fileData.location;
        if (existingBanner.imageUrl && existingBanner.imageUrl.includes('amazonaws.com')) {
            try {
                const urlObj = new URL(existingBanner.imageUrl);
                const fileKey = urlObj.pathname.substring(1);
                await s3.send(new DeleteObjectCommand({
                    Bucket: process.env.AWS_BUCKET_NAME,
                    Key: fileKey
                }));
            } catch (s3Error) {
                console.error("AWS S3 Old Image Deletion Failed:", s3Error);
            }
        }
    }
    return await bannerRepository.updateBannerById(id, updateData);
};


// Deletes a banner and its image completely
export const removeBanner = async (id) => {
    const banner = await bannerRepository.findBannerById(id);
    if (!banner) {
        throw new Error("Banner not found");
    }
    if (banner.imageUrl && banner.imageUrl.includes('amazonaws.com')) {
        try {
            const urlObj = new URL(banner.imageUrl);
            const fileKey = urlObj.pathname.substring(1); 
            const deleteParams = {
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: fileKey
            };
            await s3.send(new DeleteObjectCommand(deleteParams));
        } catch (s3Error) {
            console.error("AWS S3 Deletion Failed:", s3Error);
        }
    }
    return await bannerRepository.deleteBannerById(id);
};