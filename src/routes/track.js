import express from 'express';

const router = express.Router();

router.get('/tracks/:id', (req, res) => {
    // Lấy danh sách bài hát
    res.send('Get tracks endpoint');
});

router.post('/tracks', (req, res) => {
    // Lấy thông tin chi tiết bài hát
    res.send('Get track details endpoint');
});

export default router;