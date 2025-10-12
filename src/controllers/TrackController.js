import Track from '../models/Track.js';
import RefreshToken from '../models/RefreshToken.js';

const TrackController = {
    getTrack: async (req, res) => {
        try {
            const { title } = req.body;
            if (!title) return res.status(400).json({ message: "Title is required" });

            const track = await Track.findOne({ title })
            if (!track) return res.status(404).json({ message: "Track not found" });

            // const trackData = new Track(track);
            // await trackData.save();
            return res.status(200).json({ message: "Track found", data: track });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error: error.message });
        }
    }
}

export default TrackController;