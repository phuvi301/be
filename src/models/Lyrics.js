import mongoose from "mongoose";

const LyricsSchema = new mongoose.Schema(
    {
        lyrics: [
            { type: mongoose.Schema.Types.ObjectId, ref: "LyricLine" }
        ],
    },
    { timestamps: true }
);

const LyricLineSchema = new mongoose.Schema(
    {
        timestamp: { type: Number, required: true }, // time in seconds
        content: { type: String, required: true },
    },
    { timestamps: true }
);

export const LyricLine = mongoose.model("LyricLine", LyricLineSchema);
export default mongoose.model("Lyrics", LyricsSchema);