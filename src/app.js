import dotenv from "dotenv";
import db from "./config/db.js";
import express from "express";
import cors from "cors"
import cookieParser from "cookie-parser";

import routes from "./routes/index.js";

dotenv.config();

// Kết nối DB trước khi khởi động server
await db.connectDB();


const app = express(); 
const port = process.env.PORT || 8080;

app.use(cors({
    origin: 'localhost:3000',
    credentials: true,
    methods: 'GET,PUT,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204
}));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true, parameterLimit: 50000 }));
app.use(express.json());
app.use(express.raw());
app.use(express.text());

// Routes
app.use("/api/auth", routes.auth);
app.use("/api/tracks", routes.track);
app.use("/api/search", routes.search);
app.use("/api/playlists", routes.playlist);
app.use("/api/users", routes.user);

app.listen(port, function(){
    console.log(`Your app running on http://localhost:${port}`);
})