// middleware/upload.js (hoặc nơi bạn cấu hình multer)
const multer = require('multer');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/') // Thư mục lưu file tạm
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});

// Cấu hình filter để cho phép file .lrc và .txt
const fileFilter = (req, file, cb) => {
    if (file.fieldname === "file" && !file.mimetype.startsWith("audio/")) {
        return cb(new Error("Only audio files are allowed!"), false);
    }
    if (file.fieldname === "thumbnail" && !file.mimetype.startsWith("image/")) {
        return cb(new Error("Only image files are allowed!"), false);
    }
    // Cho phép upload lyric
    if (file.fieldname === "lyrics") {
        // Kiểm tra đuôi file vì mimetype của .lrc có thể không chuẩn
        if (!file.originalname.match(/\.(lrc|txt)$/)) {
            return cb(new Error("Only .lrc or .txt files are allowed for lyrics!"), false);
        }
    }
    cb(null, true);
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter
});

// Export cấu hình cho phép nhận nhiều fields
// Frontend gửi: 'file', 'thumbnail', 'lyrics'
const uploadFields = upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
    { name: 'lyrics', maxCount: 1 }
]);

module.exports = { uploadFields };