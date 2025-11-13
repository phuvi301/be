import express from "express";
import FollowController from "../controllers/FollowController.js";
import authMiddleware from "../middlewares/authentication.js";

const router = express.Router();

router.post("/:userId/follow", authMiddleware.verifyToken, FollowController.followUser);
router.delete("/:userId/follow", authMiddleware.verifyToken, FollowController.unfollowUser);
router.get("/:userId/following", FollowController.getFollowing);
router.get("/:userId/followers", FollowController.getFollowers);
router.get("/:userId/follow-status", authMiddleware.verifyToken, FollowController.checkFollowStatus);

export default router;
