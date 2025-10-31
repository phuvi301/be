import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import axios from "axios";
import User from "../models/User.js";
import RefreshToken from "../models/RefreshToken.js";

const ACCESS_TOKEN_EXPIRES_TIME = 15 * 60 * 1000; // 15m
const REFRESH_TOKEN_EXPIRES_TIME = 1 * 24 * 60 * 60 * 1000; // 1d

const AuthController = {
    register: async (req, res) => {
        try {
            const { email, password } = req.body;
            if (!email || !password) return res.status(400).json({ message: "Email and password are required" });

            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(409).json({ message: "Email already exists" });
            }

            let username = email.split("@")[0];
            const existingUsername = await User.findOne({ username });
            if (existingUsername) {
                username = username + "_" + Date.now();
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            const newUser = new User({
                username,
                email,
                password: hashedPassword,
                isVerified: false,
                accountType: "manual",
            });
            await newUser.save();

            const { password: _, ...user } = newUser._doc;

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
            if (!user) return res.status(401).json({ message: "Email or password is incorrect" });

            if (!user.password) {
                return res.status(401).json({
                    message: "This account was created via social login. Please use Google or Facebook to sign in.",
                });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return res.status(401).json({ message: "Email or password is incorrect" });

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
                sameSite: "strict",
                maxAge: REFRESH_TOKEN_EXPIRES_TIME,
            });

            res.status(200).json({
                message: "Signed in successfully",
                data: { ...updateUser, accessToken, accessExpireTime: Date.now() + ACCESS_TOKEN_EXPIRES_TIME },
            });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    },
    googleAuth: async (req, res) => {
        try {
            const { accessToken } = req.body;
            if (!accessToken) {
                return res.status(400).json({ message: "Google access token is required" });
            }

            const googleResponse = await axios.get(
                `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`
            );

            const { id, email, name, picture } = googleResponse.data;

            if (!email) {
                return res.status(400).json({ message: "Cannot get email from Google account" });
            }

            let user = await User.findOne({ email });

            if (!user) {
                return res.status(404).json({
                    message: "Account not found. Please register first.",
                    requireRegistration: true,
                });
            } else if (!user.googleId) {
                user.googleId = id;
                if (picture && !user.avatar) user.avatar = picture;
                user.accountType = user.password ? "hybrid" : "google";
                await user.save();
            }

            const jwtAccessToken = jwt.sign({ id: user._id }, process.env.JWT_ACCESS_KEY, {
                expiresIn: ACCESS_TOKEN_EXPIRES_TIME,
            });
            const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_KEY, {
                expiresIn: REFRESH_TOKEN_EXPIRES_TIME,
            });

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
                sameSite: "strict",
                maxAge: REFRESH_TOKEN_EXPIRES_TIME,
            });

            const { password: _, ...updateUser } = user._doc;
            res.status(200).json({
                message: "Google authentication successful",
                data: {
                    ...updateUser,
                    accessToken: jwtAccessToken,
                    accessExpireTime: Date.now() + ACCESS_TOKEN_EXPIRES_TIME,
                },
            });
        } catch (error) {
            console.log("Google auth error:", error);
            res.status(500).json({ message: "Google authentication failed", error: error.message });
        }
    },
    googleRegister: async (req, res) => {
        try {
            const { accessToken } = req.body;
            if (!accessToken) {
                return res.status(400).json({ message: "Google access token is required" });
            }

            const googleResponse = await axios.get(
                `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`
            );

            const { id, email, name, picture } = googleResponse.data;

            if (!email) {
                return res.status(400).json({ message: "Cannot get email from Google account" });
            }

            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(409).json({ message: "Email already exists. Please sign in instead." });
            }

            let username = name || email.split("@")[0];
            const existingUsername = await User.findOne({ username });
            if (existingUsername) {
                username = username + "_" + Date.now();
            }

            const newUser = new User({
                username,
                email,
                googleId: id,
                avatar: picture,
                isVerified: true,
                accountType: "google",
            });
            const user = await newUser.save();

            const jwtAccessToken = jwt.sign({ id: user._id }, process.env.JWT_ACCESS_KEY, {
                expiresIn: ACCESS_TOKEN_EXPIRES_TIME,
            });
            const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_KEY, {
                expiresIn: REFRESH_TOKEN_EXPIRES_TIME,
            });

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
                sameSite: "strict",
                maxAge: REFRESH_TOKEN_EXPIRES_TIME,
            });

            const { password: _, ...updateUser } = user._doc;
            res.status(200).json({
                message: "Google registration successful",
                data: {
                    ...updateUser,
                    accessToken: jwtAccessToken,
                    accessExpireTime: Date.now() + ACCESS_TOKEN_EXPIRES_TIME,
                },
            });
        } catch (error) {
            console.log("Google register error:", error);
            res.status(500).json({ message: "Google registration failed", error: error.message });
        }
    },
    facebookAuth: async (req, res) => {
        try {
            const { accessToken } = req.body;
            if (!accessToken) {
                return res.status(400).json({ message: "Facebook access token is required" });
            }

            const facebookResponse = await axios.get(
                `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`
            );

            const { id, email, name, picture } = facebookResponse.data;

            if (!email) {
                return res.status(400).json({ message: "Cannot get email from Facebook account" });
            }

            let user = await User.findOne({ email });

            if (!user) {
                let username = name || email.split("@")[0];
                const existingUsername = await User.findOne({ username });
                if (existingUsername) {
                    username = username + "_" + Date.now();
                }

                const newUser = new User({
                    username,
                    email,
                    facebookId: id,
                    avatar: picture?.data?.url,
                    isVerified: true,
                    accountType: "facebook",
                });
                user = await newUser.save();
            } else if (!user.facebookId) {
                user.facebookId = id;
                if (picture?.data?.url && !user.avatar) user.avatar = picture.data.url;
                user.accountType = user.password ? "hybrid" : "facebook";
                await user.save();
            }

            const jwtAccessToken = jwt.sign({ id: user._id }, process.env.JWT_ACCESS_KEY, {
                expiresIn: ACCESS_TOKEN_EXPIRES_TIME,
            });
            const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_KEY, {
                expiresIn: REFRESH_TOKEN_EXPIRES_TIME,
            });

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
                sameSite: "strict",
                maxAge: REFRESH_TOKEN_EXPIRES_TIME,
            });

            const { password: _, ...updateUser } = user._doc;
            res.status(200).json({
                message: "Facebook authentication successful",
                data: {
                    ...updateUser,
                    accessToken: jwtAccessToken,
                    accessExpireTime: Date.now() + ACCESS_TOKEN_EXPIRES_TIME,
                },
            });
        } catch (error) {
            console.log("Facebook auth error:", error);
            res.status(500).json({ message: "Facebook authentication failed", error: error.message });
        }
    },
    getOAuthConfig: async (req, res) => {
        try {
            res.status(200).json({
                googleClientId: process.env.GOOGLE_CLIENT_ID,
                facebookAppId: process.env.FACEBOOK_APP_ID,
            });
        } catch (error) {
            res.status(500).json({ message: "Failed to get OAuth config", error: error.message });
        }
    },
    signout: async (req, res) => {
        try {
            const token = req.cookies?.refreshToken;
            if (!token) return res.status(401).json({ message: "Unauthorized" });
            await RefreshToken.deleteOne({ token });
            res.clearCookie("refreshToken");
            res.status(200).json({ message: "Signed out successfully" });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    },
    changePassword: async (req, res) => {
        try {
            const user = await User.findById(req.user.id);
            if (!user) return res.status(404).json({ message: "Unknown user" });

            if (user.accountType !== "manual" && user.accountType !== "hybrid")
                return res.status(401).json({ message: "Please contact external service to get support" });

            const { password, newPassword } = req.body;
            const passwordMatch = await bcrypt.compare(password, user.password);
            const newpasswordMatch = await bcrypt.compare(newPassword, user.password);
            if (!passwordMatch) return res.status(403).json({ message: "Something issus, please check again" });
            if (newpasswordMatch)
                return res.status(403).json({ message: "New password must not be same an old password" });

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);

            user.password = hashedPassword;
            await user.save();

            res.status(200).json({ message: "Password changed" });
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
                if (err) return res.status(403).json({ message: "Invalid token" });
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
                    sameSite: "strict",
                    maxAge: REFRESH_TOKEN_EXPIRES_TIME,
                });
                res.status(200).json({
                    message: "Refresh successfully",
                    data: { accessToken: newAccessToken, accessExpireTime: Date.now() + ACCESS_TOKEN_EXPIRES_TIME },
                });
            });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    },
};

export default AuthController;
