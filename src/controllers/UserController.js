import User from "../models/User.js";
import Track from "../models/Track.js";
import Playlist from "../models/Playlists.js";
import redisService from "../service/redisService.js";

const UserController = {
    isOwner: (reqId, acpId) => reqId && reqId.toString() === acpId.toString(),
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
            const { nickname, bio, country } = req.body;
            const user = req.resource;
            user.nickname = nickname || user.nickname;
            user.bio = bio || user.bio;
            user.country = country || user.country;
            await user.save();
            return res
                .status(200)
                .json({ message: "Update successfully", data: UserController.filterPassword(user._doc) });
        } catch (error) {
            return res.status(500).json({ message: "Server error", error: error.message });
        }
    },
    updateThumbnail: async (req, res) => {
        try {
            const user = req.resource;
            user.thumbnailUrl = req.body.thumbnailUrl;
            await user.save();
            res.status(200).json({
                message: "Update thumbnail successfully",
                data: UserController.filterPassword(user._doc),
            });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
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

    updateLikedTrack: async (req, res) => {
        try {
            const user = req.resource;
            const trackInfo = await Track.findById(req.params.trackId);
            if (!trackInfo) return res.status(404).json({ message: "Track not found" });
            if (trackInfo.status == "private" && !UserController.isOwner(user._id, trackInfo.owner))
                return res.status(403).json({ message: "Permission deny" });
            user.likedTracks = user.likedTracks.includes(trackInfo._id)
                ? user.likedTracks.filter((track) => track.toString() !== trackInfo._id.toString())
                : [...user.likedTracks, trackInfo._id];
            await user.save();
            res.status(200).json({
                message: "Update liked track successfully",
            });
        } catch (error) {
            console.log(error);
            return res.status(500).json({ message: "Server error", error: error.message });
        }
    },

    // Thêm bài hát vào mục "Đã nghe gần đây"
    addTrackToHis: async (req, res) => {
        try {
            const { trackID } = req.body;
            await redisService.addToHistory(req.params.id, trackID);
            return res.status(200).json({ message: `Track with id ${trackID} has been added to history` });
        } catch (err) {
            return res.status(500).json({ message: "Server error", err });
        }
    },

    // Lưu tiến trình đang nghe
    addTrackToCurr: async (req, res) => {
        try {
            const { trackID, playbackTime, repeat, playlistID, index, shuffle, volume } = req.body;
            await redisService.addToCurrent(req.params.id, trackID, playbackTime, repeat, shuffle, volume, playlistID, index);
            return res.status(200).json({ message: "Save progress successfully" });
        } catch (err) {
            return res.status(500).json({ message: "Server error", err });
        }
    },

    // Lấy tiến trình đang nghe
    getProgress: async (req, res) => {
        try {
            const progress = await redisService.getPlaybackState(req.params.id);
            return res.status(200).json({ prog: progress });
        } catch (err) {
            return res.status(500).json({ message: "Server error", error: err.message });
        }
    },

    // Cập nhật playbackTime
    udtPlaybackTime: async (req, res) => {
        try {
            const { playbackTime, repeat, shuffle, volume } = req.body;
            await redisService.updatePlaybackTime(req.params.id, playbackTime, repeat, shuffle, volume);
            return res.status(200).json({ message: "Update playbackTime succesfully" });
        } catch (err) {
            return res.status(500).json({ message: "Server error", err });
        }
    },
    
    getArtistProfile  : async (req, res) => {
        try {
        const { id } = req.params;

        // 1. Lấy thông tin nghệ sĩ
        // Giả sử model User có trường nickname, avatar/thumbnailUrl
        const artist = await User.findById(id).select("nickname thumbnailUrl email"); 

        if (!artist) {
            return res.status(404).json({ message: "Artist not found" });
        }

        // 2. Lấy tất cả bài hát của nghệ sĩ đó (Giả sử Track có trường 'owner' hoặc 'artistId')
        // Sắp xếp theo lượt nghe giảm dần (để hiển thị bài phổ biến trước)
        const tracks = await Track.find({ owner: id }).sort({ playCount: -1 });

        // 3. Tính tổng lượt nghe (Monthly listeners giả lập)
        const totalPlays = tracks.reduce((sum, track) => sum + (track.playCount || 0), 0);

        res.status(200).json({
            artist: {
                _id: artist._id,
                name: artist.nickname || artist.username,
                thumbnailUrl: artist.thumbnailUrl,
                totalPlays: totalPlays
            },
            tracks: tracks
        });

    } catch (error) {
        res.status(500).json({ message: "Internal server error", error });
    }
    },
    
    getArtistProfile  : async (req, res) => {
        try {
        const { id } = req.params;

        // 1. Lấy thông tin nghệ sĩ
        // Giả sử model User có trường nickname, avatar/thumbnailUrl
        const artist = await User.findById(id).select("nickname thumbnailUrl email"); 

        if (!artist) {
            return res.status(404).json({ message: "Artist not found" });
        }

        // 2. Lấy tất cả bài hát của nghệ sĩ đó (Giả sử Track có trường 'owner' hoặc 'artistId')
        // Sắp xếp theo lượt nghe giảm dần (để hiển thị bài phổ biến trước)
        const tracks = await Track.find({ owner: id }).sort({ playCount: -1 });

        // 3. Tính tổng lượt nghe (Monthly listeners giả lập)
        const totalPlays = tracks.reduce((sum, track) => sum + (track.playCount || 0), 0);

        res.status(200).json({
            artist: {
                _id: artist._id,
                name: artist.nickname || artist.username,
                thumbnailUrl: artist.thumbnailUrl,
                totalPlays: totalPlays
            },
            tracks: tracks
        });

    } catch (error) {
        res.status(500).json({ message: "Internal server error", error });
    }
    },

    getArtistProfile: async (req, res) => {
        try {
            const { id } = req.params;

            // 1. Lấy thông tin nghệ sĩ
            // Giả sử model User có trường nickname, avatar/thumbnailUrl
            const artist = await User.findById(id).select("nickname thumbnailUrl email");

            if (!artist) {
                return res.status(404).json({ message: "Artist not found" });
            }

            // 2. Lấy tất cả bài hát của nghệ sĩ đó (Giả sử Track có trường 'owner' hoặc 'artistId')
            // Sắp xếp theo lượt nghe giảm dần (để hiển thị bài phổ biến trước)
            const tracks = await Track.find({ owner: id }).sort({ playCount: -1 });

            // 3. Tính tổng lượt nghe (Monthly listeners giả lập)
            const totalPlays = tracks.reduce((sum, track) => sum + (track.playCount || 0), 0);

            res.status(200).json({
                artist: {
                    _id: artist._id,
                    name: artist.nickname || artist.username,
                    thumbnailUrl: artist.thumbnailUrl,
                    totalPlays: totalPlays,
                },
                tracks: tracks,
            });
        } catch (error) {
            res.status(500).json({ message: "Internal server error", error });
        }
    },
};

export default UserController;
