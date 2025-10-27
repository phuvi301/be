import express from 'express';
import PlaylistsController from '../controllers/PlaylistsController.js';
import middlewareController from '../middlewares/index.js';

const router = express.Router();

router.get('/:id', PlaylistsController.getPlaylist);
router.post('/', middlewareController.verifyToken, PlaylistsController.createPlaylist);
router.put('/:id', middlewareController.verifyToken, PlaylistsController.updatePlaylist);

router.delete('/:id', PlaylistsController.deletePlaylist);
router.post('/:id/add', PlaylistsController.addTrackToPlaylist);
router.delete('/:id/remove', PlaylistsController.removeTrackFromPlaylist);

export default router;