import Track from "../models/Track.js";
import multer from "multer";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ dest: "temp/" });
const FOLDER = "uploads";


const uploadToCloudinary = async (req, res, next) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ message: "No file uploaded" });

        // Upload lên Cloudinary
        const result = await cloudinary.uploader.upload(file.path, {
            folder: FOLDER, // tên folder trong Cloudinary (được tạo tự động nếu chưa có)
            resource_type: "image",
        });

        // Lưu link ảnh vào req.body
        req.body.thumbnailUrl = result.secure_url;

        // Xoá file tạm
        fs.unlinkSync(file.path);

        // Thông báo thành công
        console.log("Image uploaded to Cloudinary");

        next();
    } catch (err) {
        console.error("Cloudinary upload error:", err);
        res.status(500).json({ message: "Error uploading image to Cloudinary" });
    }
};

const deleteImageFromCloudinary = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Lấy secure_url từ database
        const track = await Track.findById(id);

        const secure_url = track.thumbnailUrl;
        if (!secure_url) return res.status(400).json({ message: "No image URL found" });

        // Lấy public_id từ secure_url
        const publicId =  (FOLDER + secure_url.split(`/${FOLDER}`)[1]).replace(/.[^/.]+$/, "");

        // Xoá ảnh khỏi Cloudinary
        await cloudinary.uploader.destroy(publicId);

        // Thông báo thành công
        console.log("Image deleted from Cloudinary");
        
        next();
    } catch (error) {
        console.error("Error deleting image from Cloudinary:", error);
    }
};

export default { upload, uploadToCloudinary, deleteImageFromCloudinary };
