import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import RefreshToken from "../models/RefreshToken.js";

const ACCESS_TOKEN_EXPIRES_TIME = 15 * 60 * 1000; // 15m
const REFRESH_TOKEN_EXPIRES_TIME = 1 * 24 * 60 * 60 * 1000; // 1d

const AuthController = {
    register: async (req, res) => {
        try {
            const { username, email, password } = req.body;
            if (!username || !email || !password)
                return res.status(400).json({ message: "Username, email and password are required" });

            const existingUser = await User.findOne({ $or: [{ username }, { email }] });
            if (existingUser) return res.status(409).json({ message: "Username or email already exists" });

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            const newUser = new User({ username, email, password: hashedPassword });
            const { password: _, ...user } = await newUser.save();

            res.status(200).json({ message: "Registered successfully", data: user });
        } catch (error) {
            console.log(error);
            res.status(500).json({ message: "Server error", error: error.message });
        }
    },
    signin: async (req, res) => {
        try {
            const { email, password } = req.body;
            if (!email || !password) return res.status(400).json({ message: "Email and password are required" });

            const user = await User.findOne({ email });
            if (!user) return res.status(401).json({ message: "Email or password is unpredicted" });

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return res.status(401).json({ message: "Email or password is unpredicted" });

            const accessToken = jwt.sign({ id: user._id }, process.env.JWT_ACCESS_KEY, {
                expiresIn: ACCESS_TOKEN_EXPIRES_TIME,
            });
            const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_KEY, {
                expiresIn: REFRESH_TOKEN_EXPIRES_TIME,
            });

            const { password: _, ...updateUser } = user._doc;

            const newRefreshToken = new RefreshToken({
                token: refreshToken,
                user: user._id,
                expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRES_TIME),
            });
            await newRefreshToken.save();

            res.cookie("refreshToken", refreshToken, {
                httpOnly: true,
                secure: false,
                path: "/",
                sameSite: "none",
                maxAge: REFRESH_TOKEN_EXPIRES_TIME,
            });

            res.status(200).json({ message: "Signed in successfully", data: { ...updateUser, accessToken } });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    },
    signout: async (req, res) => {
        try {
            const token = req.cookies?.refreshToken;
            if (!token) res.status(401).json({ message: "Unauthorized" });
            await RefreshToken.deleteOne({ token });
            res.clearCookie("refreshToken");
            res.status(200).json({ message: "Signed out successfully" });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    },
    refresh: async (req, res) => {
        try {
            const refreshToken = req.cookies.refreshToken;
            if (!refreshToken) return res.status(401).json({ message: "Unauthenticated" });
            const refreshTokenDoc = await RefreshToken.findOne({ token: refreshToken });
            if (!refreshTokenDoc) return res.status(401).json({ message: "Unauthenticated" });
            jwt.verify(refreshToken, process.env.JWT_REFRESH_KEY, async (err, user) => {
                if (err || refreshTokenDoc.user !== user.id) return res.status(403).json({ message: "Invalid token" });
                await RefreshToken.deleteOne({ token: refreshToken });
                const newAccessToken = jwt.sign({ id: user.id }, process.env.JWT_ACCESS_KEY, {
                    expiresIn: ACCESS_TOKEN_EXPIRES_TIME,
                });
                const newRefreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_KEY, {
                    expiresIn: REFRESH_TOKEN_EXPIRES_TIME,
                });
                const newRefreshTokenDoc = new RefreshToken({
                    token: newRefreshToken,
                    user: user.id,
                    expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRES_TIME),
                });
                await newRefreshTokenDoc.save();
                res.cookie("refreshToken", newRefreshToken, {
                    httpOnly: true,
                    secure: false,
                    path: "/",
                    sameSite: "none",
                    maxAge: REFRESH_TOKEN_EXPIRES_TIME,
                });
                res.status(200).json({ message: "Refresh successfully", data: { accessToken: newAccessToken } });
            });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    },
};

export default AuthController;
