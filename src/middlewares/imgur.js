import multer from 'multer';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const upload = multer({ dest: 'temp/' });

async function imgurUpload(req, res, next) {
    try {
        const file = req.file;
        if (!file) return next(); // Nếu không có file ảnh thì bỏ qua

        // Nếu chưa thêm IMGUR_CLIENT_ID vào .env thì báo lỗi
        if (!process.env.IMGUR_CLIENT_ID) {
            return res.status(500).json({ message: 'IMGUR_CLIENT_ID is not set in environment variables' });
        }

        const imageData = fs.readFileSync(file.path, { encoding: 'base64' });

        // Gửi ảnh lên Imgur
        const response = await axios.post(
            'https://api.imgur.com/3/image',
            { image: imageData, type: 'base64' },
            {
                headers: {
                    Authorization: `Client-ID ${process.env.IMGUR_CLIENT_ID}`,
                },
            }
        );

        // Lấy link ảnh trả về
        const imageUrl = response.data.data.link;

        // Gắn link vào body
        req.body.thumbnailUrl = imageUrl;

        // Xóa file tạm
        fs.unlinkSync(file.path);

        return next();
    } catch (error) {
        console.error('Imgur upload error:', error.message);
        return res.status(500).json({ message: 'Error uploading image to Imgur' });
    }
}

export const handleUpload = [upload.single('thumbnail'), imgurUpload];