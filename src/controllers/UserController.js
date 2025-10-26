import User from "../models/User.js";
import addToHistory from "../service/redisService.js";

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
            const populateOptions = isTracksRequired
                ? [
                      {
                          path: "tracks",
                          match: isOwner ? {} : { status: "public" },
                      },
                  ]
                : [] + isPlaylistsRequired
                ? [
                      {
                          path: "playlists",
                          match: isOwner ? {} : { status: "public" },
                      },
                  ]
                : [];
            if (isLikeTracksRequired && isOwner)
                populateOptions.push({
                    path: "likedTracks",
                });
            await user.populate(populateOptions);
            res.status(200).json({ message: "Fetch user successfully", data: UserController.filterPassword(user) });
        } catch (error) {
            res.status(500).json({ message: "Server error", error });
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
            res.status(200).json({ message: "Update successfully", data: UserController.filterPassword(user) });
        } catch (error) {
            res.status(500).json({ message: "Server error", error });
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
            res.status(200).json({ message: "Update successfully", data: UserController.filterPassword(user) });
        } catch (error) {
            res.status(500).json({ message: "Server error", error });
        }
    },

    // Thêm bài hát vào mục "Đã nghe gần đây"
    addTrackToHis: async (req, res) => {
        try {
            const {trackID} = req.body;
            await addToHistory(req.params.id, trackID);
            res.status(200).json({message: `Track with id ${trackID} has been added to history`});
        } catch(err) {
            res.status(500).json({message: "Server error", err});
        }
    }
};

export default UserController;
