import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
    {
        recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        type: { 
            type: String, 
            enum: ["new_track", "new_playlist", "new_follow", "track_liked"], 
            required: true 
        },
        title: { type: String, required: true },
        message: { type: String, required: true },
        data: {
            trackId: { type: mongoose.Schema.Types.ObjectId, ref: "Track" },
            playlistId: { type: mongoose.Schema.Types.ObjectId, ref: "Playlist" },
            followerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            likerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            releaseDate: { type: Date },
            directLink: { type: String }
        },
        isRead: { type: Boolean, default: false },
        isActive: { type: Boolean, default: true }
    },
    { timestamps: true }
);

NotificationSchema.index({ recipient: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, isRead: 1 });

export default mongoose.model("Notification", NotificationSchema);
