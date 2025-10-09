import express from 'express';

const router = express.Router();

router.get('/artists', (req, res) => {
    // Lấy danh sách nghệ sĩ
    res.send('Get artists endpoint');
});

router.get('/artists/:id', (req, res) => {
    // Lấy thông tin chi tiết nghệ sĩ
    res.send('Get artist details endpoint');
});

export default router;