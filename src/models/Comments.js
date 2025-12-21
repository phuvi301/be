import mongoose from "mongoose";

const CommentsSchema = new mongoose.Schema(
    {
        comments: [
            {
                message: { type: mongoose.Schema.Types.ObjectId, ref: "Comment" },
            },
        ],
    },
    { timestamps: true }
);

const CommentSchema = new mongoose.Schema(
    {
        owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        content: { type: String, required: true },
        likeCount: { type: Number, default: 0 },
        likedList: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        timeline: { type: Number },
        replies: { type: mongoose.Schema.Types.ObjectId, ref: "Comments" },
    },
    { timestamps: true }
);

export const Comment = mongoose.model("Comment", CommentSchema, "comment_items");
export default mongoose.model("Comments", CommentsSchema);
