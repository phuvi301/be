import express from 'express';

const router = express.Router();

router.get('/:id', (req, res) => {
    // Lấy thông tin chi tiết playlist
    res.send('Get playlist details endpoint');
});

router.post('/', (req, res) => {
    // Tạo mới playlist
    res.send('Create playlist endpoint');
});

router.put('/:id', (req, res) => {
    // Cập nhật playlist
    res.send('Update playlist endpoint');
});

router.delete('/:id', (req, res) => {
    // Xóa playlist
    res.send('Delete playlist endpoint');
});

router.post('/:id/add', (req, res) => {
    // Thêm bài hát vào playlist
    res.send('Add track to playlist endpoint');
});

router.delete('/:id/remove', (req, res) => {
    // Xóa bài hát khỏi playlist
    res.send('Remove track from playlist endpoint');
});

export default router;