import express from 'express';
import SearchController from '../controllers/SearchController.js';


const router = express.Router();

router.get('/', SearchController.searchTracks);     


export default router;