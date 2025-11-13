import mongoose from "mongoose";

const FollowSchema = new mongoose.Schema(
    {
        follower: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        following: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        isActive: { type: Boolean, default: true }
    },
    { timestamps: true }
);

// Đảm bảo không duplicate follow relationship
FollowSchema.index({ follower: 1, following: 1 }, { unique: true });

export default mongoose.model("Follow", FollowSchema);
