import Track from '../models/Track.js';
import getTrackByID, { getSignedR2Url, convertToHLS, uploadHLSFolderToR2, newtrack } from '../service/track.service.js';
import fetch from "node-fetch";
import path from "path";
import fs from "fs";

const TrackController = {
    // Để tam để test
    getAllTracks: async (req, res) => {
        try {
            const tracks = await Track.find({});
            res.status(200).json({ message: "Tracks fetched successfully", data: tracks });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    },

    getTrack: async (req, res) => {
        try {
            const { id } = req.params;
            if (!id) return res.status(400).json({ message: "Id is required" });

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
        console.error("M3U8 proxy error:", err);
        res.status(500).send("Internal Server Error");
      }
    },

    handleTs: async (req, res) => {
        const key = req.params[0];
        const signedUrl = await getSignedR2Url(key);

        const response = await fetch(signedUrl);

        res.setHeader("Content-Type", response.headers.get('content-type') || 'video/MP2T');
        response.body.pipe(res);
    },

    handleTrack: async (req, res) => {
        try {
            if (!req.file) return res.status(400).json({ message: "No file uploaded" });

            const { originalname, buffer } = req.file;
            const baseName = path.parse(originalname).name;
            const localPath = `./temp/${baseName}/${baseName}.mp3`;
            
            // Tạo thư mục tạm nếu chưa tồn tại
            fs.mkdirSync(path.dirname(localPath), { recursive: true });

            // Lưu tạm file MP3
            fs.writeFileSync(localPath, buffer);

            // Chuyển sang HLS (.m3u8 + .ts)
            await convertToHLS(localPath, baseName);

            // Xoá file MP3 tạm
            fs.rmSync(localPath);

            res.status(200).json({ message: "Convert success" });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: "Upload failed", error: err.message });
        }
    },

    resetTrack: async (req, res) => {
        try {
            const { name } = req.body;
            if (!name) return res.status(400).json({ message: "Name is required" });
            // name = song_name.mp3 => baseName = song_name
            const baseName = name.replace(/\.mp3$/, '');
            const dir = `./temp/${baseName}`;
            if (fs.existsSync(dir)) fs.rmdirSync(dir, { recursive: true });
            return res.status(200).json({ message: "Track reset success"});
        } catch (error) {
            return res.status(500).json({ message: "Server error", error: error.message });
        }
    },

    uploadTrack: async (req, res) => {
        try {
            const { name } = req.body;
            if (!name) return res.status(400).json({ message: "Name is required" });
            // name = song_name.mp3 => baseName = song_name
            const baseName = name.replace(/\.mp3$/, '');
            const localPath = `./temp/${baseName}/${baseName}.m3u8`;
            if (!fs.existsSync(localPath)) return res.status(404).json({ message: "Track not found" });

            // Upload thư mục HLS lên R2
            const r2Url = await uploadHLSFolderToR2(`./temp/${baseName}`, baseName);
            // Xoá thư mục tạm
            fs.rmdirSync(`./temp/${baseName}`, { recursive: true });
            // Metadata
            // const track = await newtrack(baseName, r2Url);
            
            return res.status(200).json({ message: "Upload success", data: r2Url });
        } catch (error) {
            return res.status(500).json({ message: "Server error", error: error.message });
        }
    }
}

export default TrackController