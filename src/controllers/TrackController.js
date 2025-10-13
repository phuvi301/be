import getTrackByID from '../service/track.service.js';
import { getSignedR2Url } from '../service/track.service.js';
import fetch from "node-fetch";

const TrackController = {
    getTrack: async (req, res) => {
        try {
            const { id } = req.params;
            if (!id) return res.status(400).json({ message: "id is required" });
            console.log(id)

            const track = await getTrackByID(id)
            if (!track) return res.status(404).json({ message: "Track not found" });
            

            return res.status(200).json({ message: "Track found", data: track });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error: error.message });
        }
    },

    handleM3u8: async (req, res) => {
      try {
        const key = req.params[0]; // songs/song_name/song_name.m3u8
        const signedUrl = await getSignedR2Url(key);
    
        const response = await fetch(signedUrl);
        const text = await response.text();
    
        const folder = key.replace(/[^/]+$/, ''); // songs/song_name/
        const rewritten = text.replace(
          /([^\n#]+\.ts)/g,
          (match) => `/api/tracks/${folder}${match}`
        );
    
        res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
        return res.send(rewritten);
      } catch (err) {
        console.error("❌ M3U8 proxy error:", err);
        res.status(500).send("Internal Server Error");
      }
    },

    handleTs: async (req, res) => {
        const key = req.params[0];
        const signedUrl = await getSignedR2Url(key);

        const response = await fetch(signedUrl);

        res.setHeader("Content-Type", response.headers.get('content-type') || 'video/MP2T');
        response.body.pipe(res);
    }
}

export default TrackController;