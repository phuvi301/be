import express from "express";
import PlaylistsController from "../controllers/PlaylistsController.js";
import middlewareController from "../middlewares/index.js";
import Playlists from "../models/Playlists.js";

const router = express.Router();

router.get("/:id", PlaylistsController.getPlaylist);
router.post("/", middlewareController.verifyToken, PlaylistsController.createPlaylist);
router.put("/:id", middlewareController.verifyToken, PlaylistsController.updatePlaylist);
router.put(
    "/:id/thumbnail",
    middlewareController.verifyToken,
    middlewareController.verifyOwner(Playlists),
    middlewareController.upload.single("thumbnail"),
    middlewareController.handleThumbnailUpdate,
    PlaylistsController.updateThumbnail
);
router.delete("/:id", middlewareController.verifyToken, PlaylistsController.deletePlaylist);
router.post("/:id/add", middlewareController.verifyToken, PlaylistsController.addTrackToPlaylist);
router.delete("/:id/remove", middlewareController.verifyToken, PlaylistsController.removeTrackFromPlaylist);

export default router;
