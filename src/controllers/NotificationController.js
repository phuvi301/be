import Notification from "../models/Notification.js";
import User from "../models/User.js";
import Track from "../models/Track.js";
import Playlists from "../models/Playlists.js";
import Follow from "../models/Follow.js";

const NotificationController = {
    // Lấy danh sách thông báo của user
    async getNotifications(req, res) {
        try {
            const { page = 1, limit = 20, unreadOnly = false } = req.query;
            const userId = req.user.id;

            const query = { recipient: userId, isActive: true };
            if (unreadOnly === 'true') {
                query.isRead = false;
            }

            const notifications = await Notification.find(query)
                .populate("sender", "username nickname avatar")
                .populate("data.trackId", "title artist thumbnailUrl")
                .populate("data.playlistId", "title thumbnailUrl")
                .sort({ createdAt: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit);

            const total = await Notification.countDocuments(query);
            const unreadCount = await Notification.countDocuments({ 
                recipient: userId, 
                isRead: false, 
                isActive: true 
            });

            res.status(200).json({
                message: "Fetch notifications successfully",
                data: {
                    notifications,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        pages: Math.ceil(total / limit)
                    },
                    unreadCount
                }
            });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    },

      // Đánh dấu thông báo đã đọc
    async markAsRead(req, res) {
        try {
            const { notificationId } = req.params;
            const userId = req.user.id;

            const notification = await Notification.findOneAndUpdate(
                { _id: notificationId, recipient: userId },
                { isRead: true },
                { new: true }
            );

            if (!notification) {
                return res.status(404).json({ message: "Notification not found" });
            }

            res.status(200).json({ 
                message: "Notification marked as read", 
                data: notification 
            });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    },

    // Đánh dấu tất cả thông báo đã đọc
    async markAllAsRead(req, res) {
        try {
            const userId = req.user.id;

            await Notification.updateMany(
                { recipient: userId, isRead: false },
                { isRead: true }
            );

            res.status(200).json({ message: "All notifications marked as read" });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    },

    // Xóa thông báo
    async deleteNotification(req, res) {
        try {
            const { notificationId } = req.params;
            const userId = req.user.id;

            const notification = await Notification.findOneAndUpdate(
                { _id: notificationId, recipient: userId },
                { isActive: false },
                { new: true }
            );

            if (!notification) {
                return res.status(404).json({ message: "Notification not found" });
            }

            res.status(200).json({ message: "Notification deleted successfully" });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    },

    // Lấy số lượng thông báo chưa đọc
    async getUnreadCount(req, res) {
        try {
            const userId = req.user.id;

            const unreadCount = await Notification.countDocuments({ 
                recipient: userId, 
                isRead: false, 
                isActive: true 
            });

            res.status(200).json({
                message: "Fetch unread count successfully",
                data: { unreadCount }
            });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    },

    // Xử lý khi click vào notification - mark as read và redirect
    async handleNotificationClick(req, res) {
        try {
            const { notificationId } = req.params;
            const userId = req.user.id;

            const notification = await Notification.findOneAndUpdate(
                { _id: notificationId, recipient: userId },
                { isRead: true },
                { new: true }
            ).populate("data.trackId", "_id title")
            .populate("data.playlistId", "_id title");

            if (!notification) {
                return res.status(404).json({ message: "Notification not found" });
            }

            let redirectUrl = "/";
            
            if (notification.type === "new_track" && notification.data?.trackId) {
                redirectUrl = `/track/${notification.data.trackId._id}`;
            } else if (notification.type === "new_playlist" && notification.data?.playlistId) {
                redirectUrl = `/playlist/${notification.data.playlistId._id}`;
            } else if (notification.data?.directLink) {
                redirectUrl = notification.data.directLink;
            }

            res.status(200).json({ 
                message: "Notification clicked successfully", 
                data: {
                    notification,
                    redirectUrl
                }
            });
        } catch (error) {
            console.error("Error in handleNotificationClick:", error);
            res.status(500).json({ message: "Server error", error: error.message });
        }
    }
};


// Service functions để tạo thông báo
export const NotificationService = {
    async createNewTrackNotification(trackId, artistId) {
        try {
            const track = await Track.findById(trackId);
            const artist = await User.findById(artistId);
            
            if (!track || !artist) return;

            const followers = await Follow.find({ 
                following: artistId, 
                isActive: true 
            }).populate("follower");

            const notifications = followers.map(follow => ({
                recipient: follow.follower._id,
                sender: artistId,
                type: "new_track",
                title: `New track from ${artist.nickname || artist.username}`,
                message: `${artist.nickname || artist.username} just released a new track "${track.title}"`,
                data: {
                    trackId: trackId,
                    releaseDate: track.createdAt || new Date(),
                    directLink: `/track/${trackId}`
                }
            }));

            if (notifications.length > 0) {
                await Notification.insertMany(notifications);
            }
        } catch (error) {
            console.error("Error creating track notification:", error);
        }
    },

    async createNewPlaylistNotification(playlistId, artistId) {
        try {
            const playlist = await Playlists.findById(playlistId);
            const artist = await User.findById(artistId);
            
            if (!playlist || !artist) return;

            const followers = await Follow.find({ 
                following: artistId, 
                isActive: true 
            }).populate("follower");

            const notifications = followers.map(follow => ({
                recipient: follow.follower._id,
                sender: artistId,
                type: "new_playlist",
                title: `New playlist from ${artist.nickname || artist.username}`,
                message: `${artist.nickname || artist.username} just created a new playlist "${playlist.title}"`,
                data: {
                    playlistId: playlistId,
                    releaseDate: playlist.createdAt || new Date(),
                    directLink: `/playlist/${playlistId}`
                }
            }));

            if (notifications.length > 0) {
                await Notification.insertMany(notifications);
            }
        } catch (error) {
            console.error("Error creating playlist notification:", error);
        }
    }
};

export default NotificationController;
