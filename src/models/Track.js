import mongoose from "mongoose";

const TrackSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        artist: { type: String, required: true },
        genre: { type: String },
        duration: { type: Number, required: true, default: 0 }, // in seconds
        audioUrl: { type: String, required: true, unique: true },
        thumbnailUrl: { type: String, required: true, unique: true },
        owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        playCount: { type: Number, default: 0 },
        likeCount: { type: Number, default: 0 },
        commentCount: { type: Number, default: 0 },
        comments: { type: mongoose.Schema.Types.ObjectId, ref: "Comments" },
        status: { type: String, enum: ["public", "private"], default: "public" },
        tags: [{ type: String }],
        lyrics: { 
            type: String, 
            default: "" // Mặc định là chuỗi rỗng nếu không có lyric
        },
        // lyrics: { type: mongoose.Schema.Types.ObjectId, ref: "Lyrics" },
        // bitrate: { type: Number }, // in kbps
        // sampleRate: { type: Number }, // in Hz
    },
    { timestamps: true }
);

TrackSchema.index({createdAt: -1});
TrackSchema.index({playCount: -1, createdAt: -1});

export default mongoose.model("Track", TrackSchema);