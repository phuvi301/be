import Track from "../models/Track.js";
import User from "../models/User.js";
import mongoService, { getSignedR2Url, convertToHLS, uploadHLSFolderToR2, deleteFolder } from "../service/track.service.js";
import { NotificationService } from "./NotificationController.js";
import fetch from "node-fetch";
import path from "path";
import fs from "fs";
import { slugify } from "transliteration";
import { getHistory } from "../service/redisService.js";
import redis from "../utils/redisClient.js";

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

            const track = await Track.findById(req.params.id)
            .populate("owner", "_id nickname username thumbnailUrl");
            if (!track) return res.status(404).json({ message: "Track not found" });

            return res.status(200).json({ message: "Track found", data: track });
        } catch (error) {
            return res.status(500).json({ message: "Server error", error: error.message });
        }
    },

    // Lấy tracks được đề xuất dựa trên thể loại, nghệ sĩ
    getRecommendedTracks: async (req, res) => {
        try {
            const userId = req.user.id; // Lấy ID user từ token
            const { refresh } = req.query; // Check xem user có muốn ép tạo mới không
            const redisKey = `recommendation:${userId}`;

            // B1: Kiểm tra cache trong Redis nếu không yêu cầu làm mới
            if (refresh !== 'true') {
                const cachedData = await redis.get(redisKey);
                
                if (cachedData) {
                    console.log('Serving from Redis Cache');
                    return res.status(200).json({
                        success: true,
                        data: JSON.parse(cachedData)
                    });
                }
            }

            // B2: Nếu không có trong cache hoặc yêu cầu làm mới, truy vấn từ MongoDB
            const { id } = req.params;
            const track = await Track.findById(id);
            if (!track) return res.status(404).json({ message: "Track not found" });

            // Tìm các track khác cùng thể loại hoặc cùng nghệ sĩ, loại trừ track hiện tại
            // 1. Tách thể loại và tên nghệ sĩ từ track hiện tại
            // Thể loại và tên nghệ sĩ có thể là 1 chuỗi nhiều thể loại, vd: "pop,rock,jazz", "Tăng Duy Tân, Drum7, 2Pillz" tách ra để so sánh và so khớp
            const genreList = track.genre ? track.genre.split(',').map(g => g.trim()).filter(g => g) : [];
            const artistList = track.artist ? track.artist.split(',').map(a => a.trim()).filter(a => a) : [];
            
            // 2. Tạo Regex Search Pattern
            // Kết quả sẽ là chuỗi dạng: "Pop|Rock|R&B"
            // Dùng escape để tránh lỗi nếu tên thể loại có ký tự đặc biệt
            const escapeRegex = (string) => {
                return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            };

            const genreRegexPattern = genreList.map(escapeRegex).join('|');
            const artistRegexPattern = artistList.map(escapeRegex).join('|');

            // Query tìm các bài liên quan
            let recommendedTracks = await Track.aggregate([
                {
                    $match: {
                        _id: { $ne: track._id }, // Loại trừ bài gốc
                        $or: [
                            { artist: { $regex: new RegExp(artistRegexPattern, 'i') } },
                            { genre: { $regex: new RegExp(genreRegexPattern, 'i') } }
                        ]
                    }
                },
                {
                    $addFields: {
                        // Tạo điểm ưu tiên (priorityScore)
                        priorityScore: {
                            $cond: {
                                if: { 
                                $regexMatch: { 
                                    input: "$artist", 
                                    regex: artistRegexPattern, 
                                    options: "i" 
                                } 
                            }, // Nếu trùng Artist
                                then: 2, // 2 điểm (Cao nhất)
                                else: 1  // 1 điểm (Trùng Genre)
                            }
                        }
                    }
                },
                { $sort: { priorityScore: -1 } }, // Sắp xếp điểm cao xuống thấp
                { $limit: 20 } // Lấy tối đa 20 bài
            ]);

            // Nếu không đủ 20 bài, lấy thêm các bài khác ngẫu nhiên để bổ sung
            if (recommendedTracks.length < 20) {
                const countNeed = 20 - recommendedTracks.length;
                
                // Lấy thêm các bài khác ngẫu nhiên (trừ bài gốc và các bài đã tìm thấy)
                const existingIds = recommendedTracks.map(t => t._id);
                existingIds.push(id); // Thêm ID bài gốc để loại trừ

                const randomTracks = await Track.aggregate([
                    { $match: { _id: { $nin: existingIds } } }, // Loại trừ các bài đã có
                    { $sample: { size: countNeed } } // Lấy ngẫu nhiên
                ]);

                // Gộp kết quả lại
                recommendedTracks = [...recommendedTracks, ...randomTracks];

                for (let i = recommendedTracks.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1)); 
                    [recommendedTracks[i], recommendedTracks[j]] = [recommendedTracks[j], recommendedTracks[i]];
                }
            }
            // B3: Lưu kết quả vào Redis với thời hạn 24 giờ
            if (recommendedTracks.length > 0) {
                await redis.set(redisKey, JSON.stringify(recommendedTracks), 'EX', 86400);
            }
            return res.status(200).json({ message: "Recommended tracks fetched", data: recommendedTracks });
        } catch (error) {
            return res.status(500).json({ message: "Server error", error: error.message });
        }
    },

    // --- [NEW] API Lấy Lyrics cho Frontend ---
    getTrackLyrics: async (req, res) => {
        try {
            const { id } = req.params;
            // Chỉ lấy trường lyrics để tối ưu performance
            const track = await Track.findById(id).select('lyrics');
            
            if (!track) return res.status(404).json({ message: "Track not found" });

            // Trả về đúng format { lyrics: "..." } mà BottomBar.js đang đợi
            return res.status(200).json({ lyrics: track.lyrics || "" });
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
            
            const recentTracks = await Track.find({}).sort({createdAt: -1}).limit(15); 
            const mostPlayedTracks = await Track.find({}).sort({playCount: -1, createdAt: -1}).limit(15); 
            
            if (id) {
                const historyList = await getHistory(id);
                history = await mongoService.getTrackByListID(historyList); 
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

    // Bước 1: Upload file audio mp3 để convert sang HLS (giữ nguyên)
    handleTrack: async (req, res) => {
        try {
            if (!req.file) return res.status(400).json({ message: "No file uploaded" });

            const { originalname, buffer } = req.file;
            const { name } = req.body;

            const baseName = path.parse(name).name;
            const safeName = slugify(baseName, { trim: true });

            const localPath = `./temp/${safeName}/${safeName}.mp3`;
            fs.mkdirSync(path.dirname(localPath), { recursive: true });

            fs.writeFileSync(localPath, buffer);

            const result = await convertToHLS(localPath, safeName);
            fs.unlinkSync(localPath);

            res.cookie("duration", result.duration, {
                httpOnly: true,
                secure: true,
                path: "/",
                sameSite: "none",
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
            
            const baseName = path.parse(name).name;
            const safeName = slugify(baseName, { trim: true });

            const dir = `./temp/${safeName}`;
            if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
            return res.status(200).json({ message: "Track reset success" });
        } catch (error) {
            return res.status(500).json({ message: "Server error", error: error.message });
        }
    },

    // Bước 2: Finalize upload - Lưu metadata, upload R2 và [NEW] Đọc Lyrics
    uploadTrack: async (req, res) => {
        try {
            const { title, artist, genre = "Unknown", originalName, thumbnailUrl } = req.body;
            const duration = req.cookies?.duration;
            
            // Xử lý files được gửi lên từ Multer (thumbnail và lyrics)
            const files = req.files || {}; 

            if (!title) return res.status(400).json({ message: "Title is required" });
            if (!artist) return res.status(400).json({ message: "Artist is required" });
            if (!duration) return res.status(400).json({ message: "Duration is required" });

            // --- XỬ LÝ LYRICS ---
            let lyricsContent = "";
            if (files['lyrics'] && files['lyrics'][0]) {
                try {
                    const lyricFile = files['lyrics'][0];
                    // Đọc nội dung file .lrc thành string (utf8)
                    lyricsContent = fs.readFileSync(lyricFile.path, 'utf8');
                    // Xóa file tạm sau khi đọc xong
                    fs.unlinkSync(lyricFile.path);
                } catch (readErr) {
                    console.error("Error reading lyric file:", readErr);
                }
            }

            // Xử lý upload folder HLS (giữ nguyên logic cũ)
            const baseName = path.parse(originalName).name;
            const safeName = slugify(baseName, { trim: true });
            const localPath = `./temp/${safeName}/${safeName}.m3u8`;
            
            if (!fs.existsSync(localPath)) return res.status(404).json({ message: "Track not found (HLS missing)" });

            // Upload thư mục HLS lên R2
            const r2Url = await uploadHLSFolderToR2(`./temp/${safeName}`, safeName);
            console.log("Uploaded to R2");

            // Xoá thư mục tạm
            fs.rmSync(`./temp/${safeName}`, { recursive: true });

            // Tạo Metadata mới
            const newTrack = new Track({
                title,
                artist,
                genre,
                duration,
                audioUrl: r2Url.m3u8Url,
                thumbnailUrl, // Nếu bạn xử lý upload ảnh riêng thì giữ nguyên, nếu upload file ảnh trực tiếp tại đây thì cần xử lý req.files['thumbnail']
                owner: req.user.id,
                lyrics: lyricsContent, // Lưu nội dung lyrics vào DB
            });

            const track = await newTrack.save();
            console.log("Track metadata saved with lyrics");
            
            // Cập nhật danh sách bài hát của user
            await User.findByIdAndUpdate(req.user.id, { $push: { tracks: track._id } });
            
            // Tạo thông báo
            await NotificationService.createNewTrackNotification(track._id, req.user.id);
            
            res.clearCookie("duration");

            return res.status(200).json({ message: "Upload success", data: track });
        } catch (error) {
            // Dọn dẹp file tạm nếu lỗi xảy ra
            if (req.files?.['lyrics']?.[0]?.path && fs.existsSync(req.files['lyrics'][0].path)) {
                 fs.unlinkSync(req.files['lyrics'][0].path);
            }
            return res.status(500).json({ message: "Server error", error: error.message });
        }
    },

    deleteTrack: async (req, res) => {
        try {
            const { id } = req.params;

            const track = await Track.findById(id);
            if (!track) return res.status(404).json({ message: "Track not found" });

            const pathName = track.audioUrl.split("/")[0] + '/' + track.audioUrl.split("/")[1] + '/'; 

            // Xoá folder chứa file HLS trên R2
            await deleteFolder(pathName);

            // Xoá track trong database
            await Track.findByIdAndDelete(id);
            console.log("Deleted track from database");

            // Cập nhật danh sách bài hát của user
            await User.findByIdAndUpdate(req.user.id, { $pull: { tracks: id } });

            return res.status(200).json({ message: "Track deleted successfully", data: track });
        } catch (error) {
            return res.status(500).json({ message: "Server error", error: error.message });
        }
    },
};

export default TrackController;