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

const uploadToCloudinary = async (req, res, next) => {
    try {
        const file = req.file;
        if (!file) return next();

        // Upload lên Cloudinary
        const result = await cloudinary.uploader.upload(file.path, {
            folder: "uploads", // tên folder trong Cloudinary (được tạo tự động nếu chưa có)
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

export default { upload, uploadToCloudinary };
