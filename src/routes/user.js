import express from 'express';

const router = express.Router();

router.get('/:id', (req, res) => {
    // Lấy nghệ sĩ
    res.send('Get artists endpoint');
});

router.put('/:id', (req, res) => {
    // Lấy thông tin chi tiết nghệ sĩ
    res.send('Get artist details endpoint');
});

export default router;