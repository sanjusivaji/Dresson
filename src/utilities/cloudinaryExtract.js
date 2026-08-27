// For 'delete' the 'cloudinary' images, when we delete the 'product'
export const extractCloudinaryId = (secureUrl) => {
    try {
        const urlParts = secureUrl.split('/');
        const folder = urlParts[urlParts.length - 2];
        const fileWithExtension = urlParts[urlParts.length - 1];
        const fileName = fileWithExtension.split('.')[0];
        return `${folder}/${fileName}`;
    } catch (error) {
        console.error("Failed to extract Cloudinary ID:", error);
        return null;
    }
};