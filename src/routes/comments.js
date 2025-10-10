import express from "express";

const router = express.Router();

router.get('/:id', (req, res) => {
    // Lấy bình luận cho bài hát hoặc playlist
    res.send('Get comments endpoint');
});

router.post('/', (req, res) => {
    // Thêm bình luận mới
    res.send('Add comment endpoint');
});

router.delete('/:id', (req, res) => {
    // Xoá bình luận
    res.send('Delete comment endpoint');
});

router.post('/:id/like', (req, res) => {
    // Thích bình luận
    res.send('Like comment endpoint');
});

export default router;