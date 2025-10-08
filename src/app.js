import dotenv from "dotenv";
import connectDB, { comments } from "./config/db.js";
import express from "express";
import mongoose from "mongoose";
dotenv.config();

// Kết nối DB trước khi khởi động server
connectDB();

const app = express(); 
const port = process.env.PORT || 8080;


app.get('/', async (req, res) => {
    const user = await comments.findOne({email: "mercedes_tyler@fakegmail.com"});
    res.send(user.greet());
});

app.listen(port, function(){
    console.log(`Your app running on http://localhost:${port}`);
})