import mongoose from "mongoose";
import Comments, { Comment } from "../models/Comments.js";
import Track from "../models/Track.js";

const CommentController = {
    getCommentContent: async (req, res) => {
        try {
            const { id } = req.params;

            const commentsDoc = await Comments.findById(id).populate({
                path: "comments.message",
                model: "Comment",
                select: "content likeCount timeline owner",
                populate: {
                    path: "owner",
                    model: "User",
                    select: "username nickname thumbnailUrl",
                },
            });

            if (!commentsDoc) {
                return res.status(404).json({ message: "Comments container not found" });
            }

            const result = commentsDoc.toObject();

            result.comments = result.comments
                .filter((c) => c.message && c.message.owner)
                .map((c) => {
                    const owner = c.message.owner;
                    const displayName = owner.nickname || owner.username;

                    return {
                        ...c,
                        message: {
                            ...c.message,
                            owner: {
                                ...owner,
                                displayName: displayName,
                            },
                        },
                    };
                });

            res.status(200).json({ message: "Get comment successfully", data: result });
        } catch (error) {
            console.error("Error getting comments:", error);
            res.status(500).json({ message: "Server error" });
        }
    },

    createCommentBlock: async (req, res) => {
        try {
            const id = req.body?.id;
            const type = req.body?.type;
            if (!type || !id)
                return res.status(404).json({ message: "Missing Information, Id and Type field is requirement" });
            if (!["track", "comments"].includes(type))
                return res.status(404).json({ message: "Wrong Type field, accept 'track' or 'comments' only" });
            const newCommentBlock = new Comments({
                comments: [],
            });
            if (type === "track") {
                const track = await Track.findById(id);
                if (!track) return res.status(404).json({ message: "Track not found" });
                const savedCommentBlock = await newCommentBlock.save();
                track.comments = savedCommentBlock._id;
                await track.save();
            } else {
                const commentBlock = await Comments.findById(id);
                if (!commentBlock) return res.status(404).json({ message: "Comment not found" });
                const savedCommentBlock = await newCommentBlock.save();
                commentBlock.replies = savedCommentBlock._id;
                await commentBlock.save();
            }
            res.status(200).json({ message: "Create comment successfully", data: newCommentBlock });
        } catch (error) {
            console.log(error);
            res.status(500).json({ message: "Server error", error: error.message });
        }
    },

    addNewComment: async (req, res) => {
        try {
            const id = req.body?.id;
            const content = req.body?.content;
            const timeline = req.body?.timeline;
            if (!id || !content || timeline === undefined) return res.status(404).json({ message: "Missing information" });
            const commentBlock = await Comments.findById(id);
            if (!commentBlock) return res.status(404).json({ message: "Comment not found" });
            const newComment = new Comment({
                owner: req.user.id,
                content,
                timeline,
            });
            const savedComment = await newComment.save();
            commentBlock.comments.unshift({
                message: savedComment._id,
            });
            await commentBlock.save();
            res.status(200).json({ message: "Added comment successfully", data: savedComment });
        } catch (error) {
            console.log(error);
            res.status(500).json({ message: "Server error", error: error.message });
        }
    },

    deleteComment: async (req, res) => {
        try {
            const { id, commentId } = req.params;
            if (!id || !commentId) return res.status(404).json({ message: "Missing information" });
            const commentBlock = await Comments.findById(id);
            if (!commentBlock) return res.status(404).json({ message: "Comment not found" });
            req.resource.deleteOne();
            commentBlock.comments = commentBlock.comments.filter((comment) => comment._id.toString() !== commentId);
            await commentBlock.save();
            res.status(200).json({ message: "Added comment successfully" });
        } catch (error) {
            console.log(error);
            res.status(500).json({ message: "Server error", error: error.message });
        }
    },

    likeComment: async (req, res) => {
        try {
            const { commentId } = req.params;
            if (!commentId) return res.status(404).json({ message: "Missing information" });
            const comment = await Comment.findById(commentId);
            if (!comment) return res.status(404).json({ message: "Comment not found" });
            comment.likedList = comment.likedList.includes(req.user.id.toString())
                ? comment.likedList.filter((likedUser) => likedUser._id.toString() !== req.user.id)
                : [req.user.id, ...comment.likedList];
            comment.likeCount = comment.likedList.length;
            await comment.save();
            res.status(200).json({ message: "Added comment successfully" });
        } catch (error) {
            console.log(error);
            res.status(500).json({ message: "Server error", error: error.message });
        }
    },
};

export default CommentController;
