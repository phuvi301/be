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
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        text: { type: String, required: true },
        likeCount: { type: Number, default: 0 },
        timeline: { type: Number },
    },
    { timestamps: true }
);

export const Comment = mongoose.model("Comment", CommentSchema);
export default mongoose.model("Comments", CommentsSchema);
