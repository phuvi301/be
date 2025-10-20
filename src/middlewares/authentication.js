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

export default verifyToken;
