import express from "express";
import CommentController from "../controllers/CommentController.js";
import middlewareController from "../middlewares/index.js";
import { Comment } from "../models/Comments.js";

const router = express.Router();

router.get("/:id", CommentController.getCommentContent);

router.post("/", middlewareController.verifyToken, CommentController.createCommentBlock);

router.post("/comment", middlewareController.verifyToken, CommentController.addNewComment);

router.delete(
    "/:id/:commentId",
    middlewareController.verifyToken,
    middlewareController.verifyOwner(Comment, { paramsField: "commentId" }),
    CommentController.deleteComment
);

router.put("/:commentId/like", middlewareController.verifyToken, CommentController.likeComment);

export default router;
