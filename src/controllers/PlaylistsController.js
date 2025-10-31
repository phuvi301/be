import Playlists from "../models/Playlists.js";
import User from "../models/User.js";
import Track from "../models/Track.js";

const PlaylistsController = {
    // Lấy thông tin playlist
    async getPlaylist(req, res) {
        try {
            const { s } = req.query;
            let trackLimit = null;

            if (s && s !== "all") {
                const parsedLimit = parseInt(s);
                if (!isNaN(parsedLimit) && parsedLimit > 0) trackLimit = parsedLimit;
            }

            let playlistQuery = Playlists.findById(req.params.id).populate("owner", "username nickname avatar");

            if (trackLimit) {
                playlistQuery = playlistQuery.populate({
                    path: "tracks",
                    options: { limit: trackLimit },
                    populate: {
                        path: "owner",
                        select: "username nickname avatar",
                    },
                });
            } else {
                playlistQuery = playlistQuery.populate({
                    path: "tracks",
                    populate: {
                        path: "owner",
                        select: "username nickname avatar",
                    },
                });
            }

            const playlist = await playlistQuery;

            if (!playlist) return res.status(404).json({ message: "Playlist not found" });

            res.status(200).json({ message: "Fetch playlist successfully", data: playlist });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    },

    // Tạo playlist
    async createPlaylist(req, res) {
        try {
            const { title, description, tracks, thumbnailUrl } = req.body;
            const userId = req.user.id;

            const newPlaylist = new Playlists({
                title,
                description,
                owner: userId,
                tracks: Array.isArray(tracks) ? tracks : [],
                thumbnailUrl: typeof thumbnailUrl === "string" && thumbnailUrl.trim() ? thumbnailUrl.trim() : "",
            });

            if (!newPlaylist.thumbnailUrl && Array.isArray(tracks) && tracks.length > 0) {
                const firstTrack = await Track.findById(tracks[0]).select("thumbnailUrl");
                if (firstTrack?.thumbnailUrl) newPlaylist.thumbnailUrl = firstTrack.thumbnailUrl;
            }

            const savedPlaylist = await newPlaylist.save();

            await User.findByIdAndUpdate(userId, {
                $push: { playlists: savedPlaylist._id },
            });

            const populatedPlaylist = await Playlists.findById(savedPlaylist._id)
                .populate("owner", "username nickname avatar")
                .populate({
                    path: "tracks",
                    populate: {
                        path: "owner",
                        select: "username nickname avatar",
                    },
                });

            res.status(201).json({ message: "Created successfully", data: populatedPlaylist });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    },

    // Chỉnh sửa playlist
    async updatePlaylist(req, res) {
        try {
            const { title, description, status } = req.body || {};
            const updateData = {};

            if (typeof title === "string") updateData.title = title;
            if (typeof description === "string") updateData.description = description;
            if (typeof status === "string" && ["public", "private"].includes(status)) updateData.status = status;

            if (Object.keys(updateData).length === 0) return res.status(304).json({ message: "Not modified" });

            const playlist = await Playlists.findById(req.params.id);
            if (!playlist) return res.status(404).json({ message: "Playlist not found" });

            // Safe comparison: handle both populated/unpopulated owner and flexible user ID
            const playlistOwnerId = String(playlist.owner?._id || playlist.owner);
            const currentUserId = req.user.id;
            if (playlistOwnerId !== currentUserId) return res.status(403).json({ message: "Permission deny" });

            const updatedPlaylist = await Playlists.findByIdAndUpdate(
                req.params.id,
                { $set: updateData },
                { new: true }
            )
                .populate("owner", "username nickname avatar")
                .populate({
                    path: "tracks",
                    populate: {
                        path: "owner",
                        select: "username nickname avatar",
                    },
                });

            res.status(200).json({ message: "Updated successfully", data: updatedPlaylist });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    },

    async updateThumbnail(req, res) {
        try {
            const { thumbnailUrl } = req.body;
            const playlist = req.resource;
            playlist.thumbnailUrl = thumbnailUrl;
            await playlist.save();
            await playlist.populate("owner", "username nickname avatar");
            await playlist.populate("tracks");
            res.status(200).json({ message: "Updated successfully", data: playlist });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    },

    async deletePlaylist(req, res) {
        try {
            const deletedPlaylist = await Playlists.findById(req.params.id);
            if (!deletedPlaylist) return res.status(404).json({ message: "Playlist not found" });

            if (req.user.id !== deletedPlaylist.owner.toString())
                return res.status(403).json({ message: "Permission deny" });
            await Playlists.findByIdAndDelete(req.params.id);

            const user = await User.findById(deletedPlaylist.owner);
            if (user) user.playlists = user.playlists.filter((id) => id.toString() !== req.params.id);
            await user.save();
            res.status(200).json({ message: "Playlist deleted successfully" });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    },
    async addTrackToPlaylist(req, res) {
        try {
            const { trackId } = req.body;
            const playlist = await Playlists.findById(req.params.id);
            if (!playlist) return res.status(404).json({ message: "Playlist not found" });

            if (req.user.id !== playlist.owner.toString()) return res.status(403).json({ message: "Permission deny" });

            const track = await Track.findById(trackId);
            if (!track) return res.status(404).json({ message: "Track not found" });
            if (track.status === "private") return res.status(403).json({ message: "Permission deny" });

            if (!playlist.tracks.includes(trackId)) playlist.tracks.push(trackId);
            await playlist.save();
            await playlist.populate("owner", "username nickname avatar");
            await playlist.populate("tracks");
            res.status(200).json({ message: "Updated successfully", data: playlist });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    },
    async removeTrackFromPlaylist(req, res) {
        try {
            const { trackId } = req.body;
            const playlist = await Playlists.findById(req.params.id);
            if (!playlist) return res.status(404).json({ message: "Playlist not found" });

            if (req.user.id !== playlist.owner.toString()) return res.status(403).json({ message: "Permission deny" });

            if (!playlist.tracks.includes(trackId)) return res.status(404).json({ message: "Track not found" });

            playlist.tracks = playlist.tracks.filter((id) => id.toString() !== trackId);
            await playlist.save();
            await playlist.populate("owner", "username nickname avatar");
            await playlist.populate("tracks");
            res.status(200).json({ message: "Updated successfully", data: playlist });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    },
};

export default PlaylistsController;
