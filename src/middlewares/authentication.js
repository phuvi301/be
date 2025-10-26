import jwt from "jsonwebtoken";

const verifyToken = (req, res, next) => {
    const token = req.headers.token;
    if (!token) return res.status(401).json({ message: "You're not authenticated" });
    const accessToken = token.split(" ")[1];
    jwt.verify(accessToken, process.env.JWT_ACCESS_KEY, (err, user) => {
        if (err) return res.status(403).json({ message: "Token is invalid" });
        req.user = user;
        next();
    });
};

const checkLogin = (req, res, next) => {
    const token = req.headers.token;
    
    // Nếu không có token -> bỏ qua
    if (!token) {
        req.user = null;
        return next();
    }
    
    // Kiểm tra định dạng Bearer token
    if (!token.startsWith('Bearer ')) {
        req.user = null;
        return next();
    }
    
    const accessToken = token.split(" ")[1];
    
    // Kiểm tra token có tồn tại và có vẻ là JWT không
    if (!accessToken || accessToken.split('.').length !== 3) {
        req.user = null;
        return next(); // KHÔNG gọi jwt.verify()
    }
    
    // CHỈ verify khi token có format JWT hợp lệ
    jwt.verify(accessToken, process.env.JWT_ACCESS_KEY, (err, user) => {
        if (err) {
            req.user = null;
        } else {
            req.user = user;
        }
        next();
    });
};

export default {verifyToken, checkLogin};
