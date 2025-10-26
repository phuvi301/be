import express from 'express';
import UserController from '../controllers/UserController.js';

const router = express.Router();

router.get('/:id', UserController.getUser);

router.put('/:id', UserController.updateUser);

router.post('/history/:id', UserController.addTrackToHis);

router.post('/tracks', UserController.getUploadedTracks);

router.post('/playlists', UserController.getUploadedPlaylists);

export default router;