import express from 'express';
import PlaylistsController from '../controllers/PlaylistsController.js';

const router = express.Router();

// Để tạm để test
router.get('/:id', PlaylistsController.getPlaylist);
router.post('/', PlaylistsController.createPlaylist);

router.put('/:id', (req, res) => {
    // Cập nhật playlist
    res.send('Update playlist endpoint');
});
router.delete('/:id', PlaylistsController.deletePlaylist);
router.post('/:id/add', PlaylistsController.addTrackToPlaylist);
router.delete('/:id/remove', PlaylistsController.removeTrackFromPlaylist);

export default router;