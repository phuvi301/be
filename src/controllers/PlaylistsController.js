import Playlists from "../models/Playlists.js";
import User from "../models/User.js";
import Track from "../models/Track.js";

const PlaylistsController = {
    // Để tạm để test
    async createPlaylist(req, res) {
        try {
            const { title, userId } = req.body;
            if (!title) return res.status(400).json({ message: "Title is required" });
            const newPlaylist = new Playlists({
                title,
                owner: userId,
            });
            const savedPlaylist = await newPlaylist.save();
            const user = await User.findById(userId);
            user.playlists.push(savedPlaylist._id);
            await user.save();
            res.status(201).json({ message: "Playlist created successfully", data: savedPlaylist });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    },

    // Để tạm để test
    async getPlaylist(req, res) {
        try {
            const playlist = await Playlists.findById(req.params.id)
                .populate("owner", "username nickname avatar")
                .populate("tracks");
            if (!playlist) return res.status(404).json({ message: "Playlist not found" });
            res.status(200).json({ message: "Playlist fetched successfully", data: playlist });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    },

    async deletePlaylist(req, res) {
        try {
            const deletedPlaylist = await Playlists.findByIdAndDelete(req.params.id);
            if (!deletedPlaylist) return res.status(404).json({ message: "Playlist not found" });

            const user = await User.findById(deletedPlaylist.owner);
            user.playlists = user.playlists.filter((id) => id.toString() !== req.params.id);
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

            const track = Track.findById(trackId);
            if (!track) return res.status(404).json({ message: "Track not found" });
            if (track.status === "private") return res.status(403).json({ message: "Permission deny" });

            if (!playlist.tracks.includes(trackId)) playlist.tracks.push(trackId);
            await playlist.save();
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

            if (!playlist.tracks.includes(trackId)) return res.status(404).json({ message: "Track not found" });

            playlist.tracks = playlist.tracks.filter((id) => id.toString() !== trackId);
            await playlist.save();
            res.status(200).json({ message: "Updated successfully", data: playlist });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    },
};

export default PlaylistsController;
