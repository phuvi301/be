import express from 'express';

const router = express.Router();

router.get('/playlists', (req, res) => {
    // Lấy danh sách playlist
    res.send('Get playlists endpoint');
});

router.get('/playlists/:id', (req, res) => {
    // Lấy thông tin chi tiết playlist
    res.send('Get playlist details endpoint');
});

router.post('/playlists', (req, res) => {
    // Tạo mới playlist
    res.send('Create playlist endpoint');
});

router.put('/playlists/:id', (req, res) => {
    // Cập nhật playlist
    res.send('Update playlist endpoint');
});

router.delete('/playlists/:id', (req, res) => {
    // Xóa playlist
    res.send('Delete playlist endpoint');
});

export default router;