import express from "express";
import PlaylistsController from "../controllers/PlaylistsController.js";
import middlewareController from "../middlewares/index.js";
import Playlists from "../models/Playlists.js";

const router = express.Router();

// Lấy thông tin playlist
router.get("/:id", PlaylistsController.getPlaylist);

// Tạo playlist mới
router.post("/", middlewareController.verifyToken, PlaylistsController.createPlaylist);

// Cập nhật thông tin playlist (không bao gồm ảnh thumbnail) 
router.put("/:id", middlewareController.verifyToken, PlaylistsController.updatePlaylist);

// Cập nhật ảnh thumbnail của playlist trên Cloudinary
router.put(
    "/:id/thumbnail",
    middlewareController.verifyToken,
    middlewareController.verifyOwner(Playlists),
    middlewareController.upload.single("thumbnail"),
    middlewareController.handleThumbnailUpdate,
    PlaylistsController.updateThumbnail
);

// Xoá playlist cùng với ảnh thumbnail trên Cloudinary nếu có
router.delete(
    "/:id",
    middlewareController.verifyToken,
    middlewareController.verifyOwner(Playlists),
    middlewareController.handleThumbnailUpdate,
    PlaylistsController.deletePlaylist
);

// Thêm hoặc xoá track khỏi playlist
router.post("/:id/add", middlewareController.verifyToken, PlaylistsController.addTrackToPlaylist);
router.delete("/:id/remove", middlewareController.verifyToken, PlaylistsController.removeTrackFromPlaylist);

export default router;
