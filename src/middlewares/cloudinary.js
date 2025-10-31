import Track from "../models/Track.js";
import multer from "multer";
import fs, { existsSync } from "fs";
import { v2 as cloudinary } from "cloudinary";
import "dotenv/config";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ dest: "temp/" });
const FOLDER = "uploads";

const helper = {
    parsedUrl: (url) => (FOLDER + url.split(`/${FOLDER}`)[1]).replace(/.[^/.]+$/, ""),
    checkExists: async function (url) {
        try {
            await cloudinary.api.resource(this.parsedUrl(url));
            return true;
        } catch (error) {
            return false;
        }
    },
    uploadToCloudinary: async (file) =>
        cloudinary.uploader.upload(file.path, {
            folder: FOLDER, // tên folder trong Cloudinary (được tạo tự động nếu chưa có)
            resource_type: "image",
        }),
    deleteFromCloudinary: async function (url) {
        const MAX_ENTRIES = 3;
        for (let i = 0; i < MAX_ENTRIES; i++) {
            try {
                const result = await cloudinary.uploader.destroy(this.parsedUrl(url));
                const exist = await this.checkExists(url);
                if (!exist) {
                    console.log("Image deleted from Cloudinary");
                    return result;
                }
                console.warn(`[${i}] Delete attempt failed (${result.result}), retrying...`);
            } catch (error) {
                console.error(`[${i}] Delete ${this.parsedUrl(url)} attempt error:`, error);
            }
            await new Promise((r) => setTimeout(r, 500));
        }
        throw new Error(`Failed to delete ${this.parsedUrl(url)} after ${MAX_ENTRIES} attempts`);
    },
};

const uploadImageToCloudinary = async (req, res, next) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ message: "No file uploaded" });

        // Upload lên Cloudinary
        const result = await helper.uploadToCloudinary(file);

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
        await helper.deleteFromCloudinary(secure_url);

        next();
    } catch (error) {
        console.error("Error deleting image from Cloudinary:", error);
        res.status(500).json({ message: "Error deleting image from Cloudinary" });
    }
};

const handleThumbnailUpdate = async (req, res, next) => {
    try {
        const playlist = req.resource;
        if (playlist.thumbnailUrl) await helper.deleteFromCloudinary(playlist.thumbnailUrl);

        const file = req.file;
        if (file) {
            const result = await helper.uploadToCloudinary(file);
            req.body.thumbnailUrl = result.secure_url;
            fs.unlinkSync(file.path);
        } else req.body.thumbnailUrl = "";

        next();
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

export default { upload, uploadImageToCloudinary, deleteImageFromCloudinary, handleThumbnailUpdate };
