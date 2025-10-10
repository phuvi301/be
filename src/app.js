import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB, { comments } from "./config/db.js";
dotenv.config();

// Kết nối DB trước khi khởi động server
await connectDB();


const app = express(); 
// Cho phép frontend truy cập API
app.use(cors({ 
    origin: `${process.env.FRONTEND_URL}$`, // Thay đổi theo url frontend
    methods: ["GET", "POST", "PUT", "DELETE"], // Các phương thức cho phép
    credentials: true
}));
app.use(express.json());
const port = process.env.PORT || 5000;


app.get('/', async (req, res) => {
    const user = await comments.findOne({email: "mercedes_tyler@fakegmail.com"});
    res.json({message: user.greet()});
});

app.listen(port, function(){
    console.log(`Your app is running on http://localhost:${port}`);
})