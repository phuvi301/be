import express from "express";
import UserController from "../controllers/UserController.js";
import middlewareController from "../middlewares/index.js";
import User from "../models/User.js";

const router = express.Router();

router.get("/:id", UserController.getUser);

router.put(
    "/:id",
    middlewareController.verifyToken,
    middlewareController.verifyOwner(User, { field: "_id" }),
    UserController.updateUser
);
router.put(
    "/:id/thumbnail",
    middlewareController.verifyToken,
    middlewareController.verifyOwner(User, { field: "_id" }),
    middlewareController.upload.single("thumbnail"),
    middlewareController.handleThumbnailUpdate,
    UserController.updateThumbnail
);

router.post("/history/:id", UserController.addTrackToHis);

router.post("/progress/:id", UserController.addTrackToCurr);

router.get("/progress/:id", UserController.getProgress);

router.post("/playback/:id", UserController.udtPlaybackTime);

router.get("/:id/artist-profile", UserController.getArtistProfile);

export default router;
