import express from 'express';
import multer from "multer";
import TrackController from '../controllers/TrackController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/:id', TrackController.getTrack);

router.get(/^\/(.+\.m3u8)$/, TrackController.handleM3u8);

router.get(/^\/(.+\.ts)$/, TrackController.handleTs);

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

router.post('/upload', TrackController.uploadTrack);

router.put('/:id', (req, res) => {
    // Cập nhật thông tin bài hát trong danh sách của người dùng
    res.send('Update user track in list endpoint');
});

router.delete('/:id', (req, res) => {
    // Xoá bài hát khỏi danh sách của người dùng
    res.send('Delete user track from list endpoint');
});

export default router;