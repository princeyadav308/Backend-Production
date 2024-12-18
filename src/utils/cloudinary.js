import { v2 as cloudinary} from "cloudinary";

import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});



const uploadCloudinary = async (localFliePath) => {
    try {
        if (!localFliePath) return null
        // upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFliePath, {
            resource_type: "auto"
        })

        // file has been uploaded successfully

        // console.log("File has uploaded on Cloudinary", response.url);

        fs.unlinkSync(localFliePath)
        
        return response
    } catch (error) {
        fs.unlinkSync(localFliePath) //removes the loacally saved temp file as the upload operation got failed.
        return null;
    }
}


export {uploadCloudinary}