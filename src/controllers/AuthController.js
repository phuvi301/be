import User from "../models/User.js";

const AuthController = {
    register: async (req, res) => {
        try {
            const { username, email, password } = req.body; // Lấy dữ liệu từ request body

            // Kiểm tra nếu username hoặc email đã tồn tại
            const existingUser = await User.findOne({ $or: [{ username }, { email }] });
            if (existingUser) return res.status(400).json({ message: "Username or email already exists" });
            // Tạo người dùng mới
            const newUser = new User({ username, email, password });
            await newUser.save();
            res.status(201).json({ message: "User registered successfully", user: newUser });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    },
    login: (req, res) => {
        // Xử lý đăng nhập
        res.send('Login endpoint');
    },
<<<<<<< Updated upstream
    logout: (req, res) => {
        // Xử lý đăng xuất
        res.send('Logout endpoint');
=======
    refresh: async (req, res) => {
        try {
            const refreshToken = req.cookies.refreshToken;
            if (!refreshToken) return res.status(401).json({ message: "Unauthenticated" });
            const refreshTokenDoc = await RefreshToken.findOne({ token: refreshToken });
            if (!refreshTokenDoc) return res.status(401).json({ message: "Unauthenticated" });
            jwt.verify(refreshToken, process.env.JWT_REFRESH_KEY, async (err, user) => {
                if (err || refreshTokenDoc.user !== user.id) return res.status(403).json({ message: "Invalid token" });
                await RefreshToken.deleteOne({ token: refreshToken });
                const newAccessToken = jwt.sign({ id: user.id }, process.env.JWT_ACCESS_KEY, { expiresIn: "1m" });
                const newRefreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_KEY, { expiresIn: "7d" });
                const newRefreshTokenDoc = new RefreshToken({ token: newRefreshToken, user: user.id });
                await newRefreshTokenDoc.save();
                res.cookie("refreshToken", newRefreshToken, {
                    httpOnly: true,
                    secure: false,
                    path: "/",
                    sameSite: "strict",
                    maxAge: 7 * 24 * 60 * 60 * 1000,
                });
                res.status(200).json({ message: "Refresh successfully", data: { accessToken: newAccessToken } });
            });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
>>>>>>> Stashed changes
    },
    getProfile: (req, res) => {
        // Lấy thông tin người dùng
        res.send('User profile endpoint');
    }
}

export default AuthController;