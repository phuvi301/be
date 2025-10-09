import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        username: { type: String, required: true, unique: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        nickname: { type: String },
        avatar: { type: String },
        bio: { type: String },
        country: { type: String },
        followerCount: { type: Number, default: 0 },
        followingCount: { type: Number, default: 0 },
        likedTracks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Track" }],
        playlists: [{ type: mongoose.Schema.Types.ObjectId, ref: "Playlist" }],
        tracks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Track" }],
    },
    { timestamps: true }
);

export default mongoose.model("User", userSchema);
