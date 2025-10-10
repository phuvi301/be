import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
    // Xử lý tìm kiếm
    res.send('Search endpoint');
});

export default router;