import Track from "../models/Track.js";
import User from "../models/User.js";
import mongoService, { getSignedR2Url, convertToHLS, uploadHLSFolderToR2, deleteFolder } from "../service/track.service.js";
import { NotificationService } from "./NotificationController.js";
import fetch from "node-fetch";
import path from "path";
import fs from "fs";
import { slugify } from "transliteration";
import { getHistory } from "../service/redisService.js";

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

    // Lấy track theo id
    getTrack: async (req, res) => {
        try {
            const { id } = req.params;
            if (!id) return res.status(400).json({ message: "Id is required" });

            const track = await mongoService.getTrackByID(id);
            if (!track) return res.status(404).json({ message: "Track not found" });

            return res.status(200).json({ message: "Track found", data: track });
        } catch (error) {
            return res.status(500).json({ message: "Server error", error: error.message });
        }
    },

    // Xử lí file .m3u8
    handleM3u8: async (req, res) => {
        try {
            const key = req.params[0]; // songs/song_name/song_name.m3u8
            const signedUrl = await getSignedR2Url(key);

            const response = await fetch(signedUrl);
            const text = await response.text();

            const folder = key.replace(/[^/]+$/, ""); // songs/song_name/
            const rewritten = text.replace(/([^\n#]+\.ts)/g, (match) => `/api/tracks/${folder}${match}`);

            res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
            return res.send(rewritten);
        } catch (err) {
            console.error("M3U8 proxy error:", err);
            res.status(500).send("Internal Server Error");
        }
    },

    // Xử lí file .ts
    handleTs: async (req, res) => {
        const key = req.params[0];
        const signedUrl = await getSignedR2Url(key);

        const response = await fetch(signedUrl);

        res.setHeader("Content-Type", response.headers.get("content-type") || "video/MP2T");
        response.body.pipe(res);
    },

    // Lấy danh sách bài hát để hiển thị
    homepageDisplay: async (req, res) => {
        try {
            const id = req.user?.id; 
            let history = [];
            
            const recentTracks = await Track.find({}).sort({createdAt: -1}).limit(15); // 15 bài được thêm vào gần đây nhất
            const mostPlayedTracks = await Track.find({}).sort({playCount: -1, createdAt: -1}).limit(15); // 15 bài có lượt playCount nhiều nhất
            
            if (id) {
                const historyList = await getHistory(id);
                history = await mongoService.getTrackByListID(historyList); // 15 bài nghe gần đây nếu có đăng nhập
            }
            
            res.status(200).json({ recent: recentTracks, mostPlayed: mostPlayedTracks, listened: history, isAuthenticated: !!id});
        } catch (err) {
            res.status(500).json({ message: "Server error", error: err.message });
        }
    },

    // Tăng lượt nghe
    increasePlayCount: async (req, res) => {
        try {
            await Track.findByIdAndUpdate(req.params.id, { $inc: { playCount: 1 } });
            res.status(200).json({ message: `Song with id(${req.params.id}) get 1 playCount` });
        } catch(err) {
            res.status(500).json({ message: "Server error", error: err.message });
        }
    },

    handleTrack: async (req, res) => {
        try {
            if (!req.file) return res.status(400).json({ message: "No file uploaded" });

            const { originalname, buffer } = req.file;
            const { name } = req.body;

            // name = song_name.mp3 => baseName = song_name
            const baseName = path.parse(name).name;

            // Chuyển sang tên an toàn (Việt -> không dấu, không space, ...)
            const safeName = slugify(baseName, { trim: true });

            // Tạo thư mục tạm nếu chưa tồn tại
            const localPath = `./temp/${safeName}/${safeName}.mp3`;
            fs.mkdirSync(path.dirname(localPath), { recursive: true });

            // Lưu tạm file MP3
            fs.writeFileSync(localPath, buffer);

            // Chuyển sang HLS (.m3u8 + .ts)
            const result = await convertToHLS(localPath, safeName);
            // Xoá file MP3 tạm
            fs.unlinkSync(localPath);

            res.cookie("duration", result.duration, {
                httpOnly: true,
                secure: false,
                path: "/",
                sameSite: "strict",
                maxAge: 15 * 60 * 1000,
            });

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
            const baseName = path.parse(name).name;
            // Chuyển sang tên an toàn (Việt -> không dấu, không space, ...)
            const safeName = slugify(baseName, { trim: true });

            // Xoá thư mục tạm nếu tồn tại
            const dir = `./temp/${safeName}`;
            if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
            return res.status(200).json({ message: "Track reset success" });
        } catch (error) {
            return res.status(500).json({ message: "Server error", error: error.message });
        }
    },

    uploadTrack: async (req, res) => {
        try {
            const { title, artist, genre = "Unknown", originalName, thumbnailUrl } = req.body;
            const duration = req.cookies?.duration;
            if (!title) return res.status(400).json({ message: "Title is required" });
            if (!artist) return res.status(400).json({ message: "Artist is required" });
            if (!duration) return res.status(400).json({ message: "Duration is required" });

            // originalName = song_name.mp3 => baseName = song_name
            const baseName = path.parse(originalName).name;
            // Chuyển sang tên an toàn (Việt -> không dấu, không space, ...)
            const safeName = slugify(baseName, { trim: true });
            const localPath = `./temp/${safeName}/${safeName}.m3u8`;
            if (!fs.existsSync(localPath)) return res.status(404).json({ message: "Track not found" });

            // Upload thư mục HLS lên R2
            const r2Url = await uploadHLSFolderToR2(`./temp/${safeName}`, safeName);
            console.log("Uploaded to R2");

            // Xoá thư mục tạm
            fs.rmSync(`./temp/${safeName}`, { recursive: true });

            // Metadata
            const newTrack = new Track({
                title,
                artist,
                genre,
                duration,
                audioUrl: r2Url.m3u8Url,
                thumbnailUrl,
                owner: req.user.id,
            });

            const track = await newTrack.save();
            console.log("Track metadata saved");
            
            // Cập nhật danh sách bài hát của user
            await User.findByIdAndUpdate(req.user.id, { $push: { tracks: track._id } });
            console.log("Added track to user's track list");
            
            // Tạo thông báo cho followers khi có bài hát mới
            await NotificationService.createNewTrackNotification(track._id, req.user.id);
            console.log("Notification sent to followers for new track");
            
            res.clearCookie("duration");

            return res.status(200).json({ message: "Upload success", data: track });
        } catch (error) {
            return res.status(500).json({ message: "Server error", error: error.message });
        }
    },

    deleteTrack: async (req, res) => {
        try {
            const { id } = req.params;

            const track = await Track.findById(id);
            if (!track) return res.status(404).json({ message: "Track not found" });

            const pathName = track.audioUrl.split("/")[0] + '/' + track.audioUrl.split("/")[1] + '/'; // Lấy "song_name" từ audioUrl

            // Xoá folder chứa file HLS trên R2
            await deleteFolder(pathName);

            // Xoá track trong database
            await Track.findByIdAndDelete(id);
            console.log("Deleted track from database");

            // Cập nhật danh sách bài hát của user
            await User.findByIdAndUpdate(req.user.id, { $pull: { tracks: id } });
            console.log("Deleted track from user's track list");

            return res.status(200).json({ message: "Track deleted successfully", data: track });
        } catch (error) {
            return res.status(500).json({ message: "Server error", error: error.message });
        }
    },
};

export default TrackController;
