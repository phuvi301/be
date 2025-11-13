import Follow from "../models/Follow.js";
import User from "../models/User.js";

const FollowController = {
    // Follow một nghệ sĩ
    async followUser(req, res) {
        try {
            const { userId } = req.params;
            const followerId = req.user.id;

            if (userId === followerId) {
                return res.status(400).json({ message: "Cannot follow yourself" });
            }

            const userToFollow = await User.findById(userId);
            if (!userToFollow) {
                return res.status(404).json({ message: "User not found" });
            }

            const existingFollow = await Follow.findOne({
                follower: followerId,
                following: userId
            });

            if (existingFollow) {
                if (existingFollow.isActive) {
                    return res.status(400).json({ message: "Already following this user" });
                } else {
                    existingFollow.isActive = true;
                    await existingFollow.save();
                }
            } else {
                await Follow.create({
                    follower: followerId,
                    following: userId
                });
            }

            await User.findByIdAndUpdate(userId, {
                $inc: { followerCount: 1 }
            });
            
            await User.findByIdAndUpdate(followerId, {
                $inc: { followingCount: 1 }
            });

            res.status(200).json({ message: "Followed successfully" });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    },

    // Unfollow một nghệ sĩ
    async unfollowUser(req, res) {
        try {
            const { userId } = req.params;
            const followerId = req.user.id;

            const followRelationship = await Follow.findOne({
                follower: followerId,
                following: userId,
                isActive: true
            });

            if (!followRelationship) {
                return res.status(404).json({ message: "Not following this user" });
            }

            followRelationship.isActive = false;
            await followRelationship.save();

            await User.findByIdAndUpdate(userId, {
                $inc: { followerCount: -1 }
            });
            
            await User.findByIdAndUpdate(followerId, {
                $inc: { followingCount: -1 }
            });

            res.status(200).json({ message: "Unfollowed successfully" });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    },

    // Lấy danh sách người đang follow
    async getFollowing(req, res) {
        try {
            const { userId } = req.params;
            const { page = 1, limit = 20 } = req.query;

            const following = await Follow.find({
                follower: userId,
                isActive: true
            })
            .populate("following", "username nickname avatar followerCount")
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

            const total = await Follow.countDocuments({
                follower: userId,
                isActive: true
            });

            res.status(200).json({
                message: "Fetch following list successfully",
                data: {
                    following: following.map(f => f.following),
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        pages: Math.ceil(total / limit)
                    }
                }
            });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    },

    // Lấy danh sách followers
    async getFollowers(req, res) {
        try {
            const { userId } = req.params;
            const { page = 1, limit = 20 } = req.query;

            const followers = await Follow.find({
                following: userId,
                isActive: true
            })
            .populate("follower", "username nickname avatar followerCount")
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

            const total = await Follow.countDocuments({
                following: userId,
                isActive: true
            });

            res.status(200).json({
                message: "Fetch followers list successfully",
                data: {
                    followers: followers.map(f => f.follower),
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        pages: Math.ceil(total / limit)
                    }
                }
            });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    },

    // Kiểm tra có đang follow user không
    async checkFollowStatus(req, res) {
        try {
            const { userId } = req.params;
            const followerId = req.user.id;

            const isFollowing = await Follow.exists({
                follower: followerId,
                following: userId,
                isActive: true
            });

            res.status(200).json({
                message: "Follow status checked",
                data: { isFollowing: !!isFollowing }
            });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    }
};

export default FollowController;
