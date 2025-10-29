import express from 'express';
import multer from "multer";
import TrackController from '../controllers/TrackController.js';
import middlewareController from '../middlewares/index.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/display', middlewareController.checkLogin, TrackController.homepageDisplay);

router.get('/:id', TrackController.getTrack);

router.post('/:id/playCount', TrackController.increasePlayCount);

router.get(/^\/(.+\.m3u8)$/, TrackController.handleM3u8);

router.get(/^\/(.+\.ts)$/, TrackController.handleTs);

// Để tam để test
router.get('/', TrackController.getAllTracks);

router.get('/:id/lyrics', (req, res) => {
    // Lấy lời bài hát
    res.send('Get lyrics endpoint');
});

router.get('/:userId/lists', (req, res) => {
    // Lấy danh sách bài hát của người dùng
    res.send('Get user track lists endpoint');
});

router.post('/', upload.single('file'), TrackController.handleTrack);

router.post('/reset', TrackController.resetTrack)

router.post('/upload', middlewareController.verifyToken, middlewareController.upload.single("thumbnail"), middlewareController.uploadImageToCloudinary, TrackController.uploadTrack);

router.put('/:id', (req, res) => {
    // Cập nhật thông tin bài hát trong danh sách của người dùng
    res.send('Update user track in list endpoint');
});

router.delete('/:id', middlewareController.verifyToken, middlewareController.deleteImageFromCloudinary, TrackController.deleteTrack);

export default router;