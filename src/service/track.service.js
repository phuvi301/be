import Track from '../models/Track.js';
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import client from '../utils/r2client.js';
import fs from "fs";
import path from "path";
import { spawn } from "child_process";

const BUCKET = "musichub";

export default function getTrackByID(songID) {
    const track = Track.findById(songID);
    return track
}

export async function getSignedR2Url(key) {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn: 3600 });
}

export const convertToHLS = (inputPath, baseName) => {
  return new Promise((resolve, reject) => {
    const outputDir = `./temp/${baseName}`;
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    // Command ffmpeg: tạo .m3u8 và các .ts segments
    const args = [
      "-i", inputPath,
      "-codec:", "copy",
      "-start_number", "0",
      "-hls_time", "1.5",
      "-hls_list_size", "0",
      "-f", "hls",
      `${outputDir}/${baseName}.m3u8`,
    ];

    const ffmpeg = spawn("ffmpeg", args);

    ffmpeg.on("close", (code) => {
      if (code === 0) resolve(outputDir);
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
  });
};

export const uploadHLSFolderToR2 = async (folderPath, baseName) => {
  const files = fs.readdirSync(folderPath);
  const folderKey = `songs/${baseName}`;

  for (const file of files) {
    const filePath = path.join(folderPath, file);
    const fileBuffer = fs.readFileSync(filePath);
    const mimeType = file.endsWith(".m3u8")
      ? "application/vnd.apple.mpegurl"
      : "video/MP2T";

    const command = new PutObjectCommand({
      Bucket: "musichub",
      Key: `${folderKey}/${file}`,
      Body: fileBuffer,
      ContentType: mimeType,
    });

    await client.send(command);
  }

  return {
    folderKey,
    m3u8Url: `https://musichub.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${folderKey}/${baseName}.m3u8`,
  };
};

export const newtrack = async (baseName, uploadedFolderInfo) => {
  return await Track.create({
    title: baseName,
    hlsUrl: uploadedFolderInfo.m3u8Url,
    folderKey: uploadedFolderInfo.folderKey,
    uploadedAt: new Date(),
  });
};