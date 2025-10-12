import express from "express";
import "dotenv/config";
// import dotenv from "dotenv";
import db from "./config/db.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fetch from "node-fetch";

import routes from "./routes/index.js";

// dotenv.config();

// Kết nối DB trước khi khởi động server
await db.connectDB();

const app = express(); 

const port = process.env.PORT || 8080;

app.use(cors({
    origin: '*',
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
routes.use(app);

const client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: `${process.env.R2_ACCESS_KEY_ID}`,
    secretAccessKey: `${process.env.R2_SECRET_ACCESS_KEY}`,
  },
});

const BUCKET = "musichub";
const song_name = "aziz_hedra-somebody's_pleasure";

async function getSignedR2Url(key) {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn: 3600 });
}

app.get(/^\/api\/tracks\/(.+\.m3u8)$/, async (req, res) => {
  try {
    const key = req.params[0]; // songs/song_name/song_name.m3u8
    const signedUrl = await getSignedR2Url(key);

    const response = await fetch(signedUrl);
    const text = await response.text();

    const folder = key.replace(/[^/]+$/, ''); // songs/song_name/
    const rewritten = text.replace(
      /([^\n#]+\.ts)/g,
      (match) => `/stream/${folder}${match}`
    );

    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    return res.send(rewritten);
  } catch (err) {
    console.error("❌ M3U8 proxy error:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.get(/^\/stream\/(.+\.ts)$/, async (req, res) => {
    const key = req.params[0];
    const signedUrl = await getSignedR2Url(key);

    const response = await fetch(signedUrl);

    res.setHeader("Content-Type", response.headers.get('content-type') || 'video/MP2T');
    response.body.pipe(res);
});

// Start server
app.listen(port, () => {
    console.log(`Your app running on http://localhost:${port}`);
})