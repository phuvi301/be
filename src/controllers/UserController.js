import User from "../models/User.js";
import Track from "../models/Track.js";
import Playlist from "../models/Playlists.js";
import redisService from "../service/redisService.js";

const UserController = {
    isOwner: (reqId, acpId) => reqId && reqId === acpId,
    filterPassword: (user) => (({ password, ...newUser }) => newUser)(user),
    getUser: async (req, res) => {
        try {
            const user = await User.findById(req.params.id);
            if (!user) return res.status(404).json({ message: "User not found" });

            const { tracks: isTracksRequired, playlists: isPlaylistsRequired, likes: isLikeTracksRequired } = req.query;
            const isOwner = UserController.isOwner(req.user?.id, user._id);
            if (!isOwner) user.likedTracks = [];
            const populateOptions = [
                ...(isTracksRequired
                    ? [
                          {
                              path: "tracks",
                              match: isOwner ? {} : { status: "public" },
                          },
                      ]
                    : []),
                ...(isPlaylistsRequired
                    ? [
                          {
                              path: "playlists",
                              match: isOwner ? {} : { status: "public" },
                          },
                      ]
                    : []),
            ];
            if (isLikeTracksRequired && isOwner)
                populateOptions.push({
                    path: "likedTracks",
                });
            await user.populate(populateOptions);
            return res
                .status(200)
                .json({ message: "Fetch user successfully", data: UserController.filterPassword(user._doc) });
        } catch (error) {
            return res.status(500).json({ message: "Server error", error: error.message });
        }
    },
    updateUser: async (req, res) => {
        try {
            const isOwner = UserController.isOwner(req.user?.id, req.params.id);
            if (!isOwner) return res.status(403).json({ message: "Permission deny" });
            const { nickname, bio, country } = req.body;
            const user = await User.findById(req.params.id);
            if (!user) return res.status(404).json({ message: "User not found" });
            await user.updateOne({ nickname, bio, country });
            return res
                .status(200)
                .json({ message: "Update successfully", data: UserController.filterPassword(user._doc) });
        } catch (error) {
            return res.status(500).json({ message: "Server error", error: error.message });
        }
    },
    updateThumbnail: async (req, res) => {
        try {
        } catch (error) {
            res.status(500).json({ message: "Server error", error });
        }
    },
    updateSecureInfo: async (req, res) => {
        try {
            const isOwner = UserController.isOwner(req.user?.id, req.params.id);
            if (!isOwner) return res.status(403).json({ message: "Permission deny" });
            const { email } = req.body;
            const user = await User.findById(req.params.id);
            if (!user) return res.status(404).json({ message: "User not found" });
            const emailVerify = await User.findOne({ email });
            if (emailVerify) return res.status(403).json({ message: "Email has been used" });
            await user.updateOne({ email });
            return res
                .status(200)
                .json({ message: "Update successfully", data: UserController.filterPassword(user._doc) });
        } catch (error) {
            return res.status(500).json({ message: "Server error", error: error.message });
        }
    },

    // Thêm bài hát vào mục "Đã nghe gần đây"
    addTrackToHis: async (req, res) => {
        try {
            const {trackID} = req.body;
            await redisService.addToHistory(req.params.id, trackID);
            return res.status(200).json({message: `Track with id ${trackID} has been added to history`});
        } catch(err) {
            return res.status(500).json({message: "Server error", err});
        }
    },

    // Lưu tiến trình đang nghe
    addTrackToCurr: async (req, res) => {
        try {
            const {trackID, playbackTime, repeat, playlistID, index} = req.body;
            await redisService.addToCurrent(req.params.id, trackID, playbackTime, repeat, playlistID, index);
            return res.status(200).json({message: "Save progress successfully"});
        } catch(err) {
            return res.status(500).json({message: "Server error", err});
        }
    },

    // Lấy tiến trình đang nghe
    getProgress: async (req, res) => {
        try {
            const progress = await redisService.getPlaybackState(req.params.id);
            return res.status(200).json({prog: progress});
        } catch (err) {
            return res.status(500).json({ message: "Server error", error: err.message });
        }
    },

    // Cập nhật playbackTime
    udtPlaybackTime: async (req, res) => {
        try {
            const {playbackTime, repeat} = req.body;
            await redisService.updatePlaybackTime(req.params.id, playbackTime, repeat);
            return res.status(200).json({message: "Update playbackTime succesfully"})
        } catch(err) {
            return res.status(500).json({message: "Server error", err});
        }
    },
};

export default UserController;
