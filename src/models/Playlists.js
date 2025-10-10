import mongoose from "mongoose";

const PlaylistsSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        description: { type: String },
        thumbnailUrl: { type: String },
        owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        tracks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Track" }],
        likeCount: { type: Number, default: 0 },
        playCount: { type: Number, default: 0 },
        commentCount: { type: Number, default: 0 },
        status: { type: String, enum: ["public", "private"], default: "public" },
        comments: { type: mongoose.Schema.Types.ObjectId, ref: "Comments" },
    },
    { timestamps: true }
);

export default mongoose.model("Playlist", PlaylistsSchema);