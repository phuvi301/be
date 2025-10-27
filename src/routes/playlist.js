import express from 'express';
import PlaylistsController from '../controllers/PlaylistsController.js';
import verifyToken from '../middlewares/authentication.js';

const router = express.Router();

router.get('/:id', verifyToken, PlaylistsController.getPlaylist);
router.post('/', verifyToken, PlaylistsController.createPlaylist);
router.put('/:id', verifyToken, PlaylistsController.updatePlaylist);

router.delete('/:id', PlaylistsController.deletePlaylist);
router.post('/:id/add', PlaylistsController.addTrackToPlaylist);
router.delete('/:id/remove', PlaylistsController.removeTrackFromPlaylist);

export default router;