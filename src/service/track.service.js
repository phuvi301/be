import Track from '../models/Track.js';
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { spawn } from "child_process";
import client from '../utils/r2client.js';
import fs from "fs";
import path from "path";
import pLimit from "p-limit";
import cliProgress from "cli-progress";

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
      "-map", "0:a:0", // chỉ lấy track audio đầu tiên
      "-c:v", "copy", // không xử lý video (nếu có)
      "-c:a", "aac", // ép chuyển sang AAC, tương thích HLS
      "-b:a", "128k",
      "-hls_time", "3",
      "-hls_list_size", "0",
      "-f", "hls",
      `${outputDir}/${baseName}.m3u8`,
    ];

    const ffmpeg = spawn("ffmpeg", args, { shell: true });

    // Check lỗi ffmpeg
    // ffmpeg.stderr.on("data", (data) => {
    //   console.error("ffmpeg error:", data.toString());
    // });

    ffmpeg.on("close", (code) => {
      if (code === 0) resolve(outputDir);
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
  });
};

export const uploadHLSFolderToR2 = async (folderPath, baseName) => {
  const files = fs.readdirSync(folderPath);
  const folderKey = `songs/${baseName}`;
  const limit = pLimit(10); // Giới hạn 10 upload đồng thời

  const total = files.length;
  // Tạo progress bar
  const bar = new cliProgress.SingleBar(
    {
      format:
        "Uploading [{bar}] {percentage}% | {value}/{total} files | ETA: {eta_formatted}",
      barCompleteChar: "█",
      barIncompleteChar: "-",
      hideCursor: true,
    },
    cliProgress.Presets.shades_classic
  );

  bar.start(total, 0);
  const startTime = Date.now();

  const uploadPromises = files.map((file) =>
    limit(async () => {
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

      bar.increment(); // ✅ Cập nhật progress
    })
  );

  await Promise.all(uploadPromises);
  bar.stop();

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`🎉 All uploads completed in ${totalTime}s`);

  return {
    folderKey,
    m3u8Url: `${folderKey}/${baseName}.m3u8`,
  };
};