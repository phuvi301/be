import Track from "../models/Track.js";

const SearchController = {
    // Tìm kiếm bài hát theo từ khóa (hỗ trợ bỏ dấu)
    searchTracks: async (req, res) => {
        try {
            const q = req.query.q;
            if (!q) {
                return res.status(400).json({ message: "Query parameter 'q' is required" });
            }

            const pipeline = [
                {
                    $search: {
                        index: "default", // tên index trong Atlas
                        compound: {
                            should: [
                                {
                                    search: {
                                        query: q,
                                        path: "title"
                                    }
                                },
                                {
                                    search: {
                                        query: q,
                                        path: "artist"
                                    }
                                }
                            ],
                            minimumShouldMatch: 1
                        },
                        highlight: { path: ["title", "artist"] }
                    }
                },  
                { $limit: 10 }
            ];

            const results = await Track.aggregate(pipeline).exec();
            return res.status(200).json({ message: "Results", data: results });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    }
};

export default SearchController;
