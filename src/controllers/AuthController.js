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
    logout: (req, res) => {
        // Xử lý đăng xuất
        res.send('Logout endpoint');
    },
    getProfile: (req, res) => {
        // Lấy thông tin người dùng
        res.send('User profile endpoint');
    }
}

export default AuthController;