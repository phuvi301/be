import express from 'express';
import multer from "multer";
import TrackController from '../controllers/TrackController.js';
import middlewareController from '../middlewares/index.js';

const router = express.Router();

// Upload này dùng cho file MP3 ban đầu (xử lý trong Memory để convert HLS)
const upload = multer({ storage: multer.memoryStorage() });

router.get('/display', middlewareController.checkLogin, TrackController.homepageDisplay);

router.get('/:id', TrackController.getTrack);

router.post('/:id/playCount', TrackController.increasePlayCount);

router.get(/^\/(.+\.m3u8)$/, TrackController.handleM3u8);

router.get(/^\/(.+\.ts)$/, TrackController.handleTs);

// Để tạm để test
router.get('/', TrackController.getAllTracks);

// --- [CẬP NHẬT] Route lấy Lyrics ---
router.get('/:id/lyrics', TrackController.getTrackLyrics);

router.get('/:userId/lists', (req, res) => {
    // Lấy danh sách bài hát của người dùng
    res.send('Get user track lists endpoint');
});

// Bước 1: Upload file MP3 để convert
router.post('/', upload.single('file'), TrackController.handleTrack);

router.post('/reset', TrackController.resetTrack);

// --- [CẬP NHẬT] Bước 2: Finalize upload (Metadata + Thumbnail + Lyrics) ---
// Sử dụng .fields() thay vì .single() để nhận nhiều loại file
router.post('/upload', 
    middlewareController.verifyToken, 
    middlewareController.upload.fields([
        { name: "thumbnail", maxCount: 1 },
        { name: "lyrics", maxCount: 1 }     // Cho phép nhận thêm file lyrics
    ]), 
    middlewareController.uploadImageToCloudinary, 
    TrackController.uploadTrack
);

router.put('/:id', (req, res) => {
    // Cập nhật thông tin bài hát trong danh sách của người dùng
    res.send('Update user track in list endpoint');
});

router.delete('/:id', middlewareController.verifyToken, middlewareController.deleteImageFromCloudinary, TrackController.deleteTrack);

export default router;