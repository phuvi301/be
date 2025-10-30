import Track from '../models/Track.js';
import { GetObjectCommand, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { execSync, spawn } from "child_process";
import client from '../utils/r2client.js';
import fs from "fs";
import path from "path";
import pLimit from "p-limit";
import cliProgress from "cli-progress";
import mongoose from 'mongoose';

const BUCKET = "musichub";

const getTrackByID = async (trackID) => {
  return await Track.findById(trackID);
}

const getTrackByListID = async (listID) => { 
  const tracks = await Track.find({ 
    _id: { $in: listID.map(id => new mongoose.Types.ObjectId(id)) } 
  });
  
  // Sắp xếp lại theo thứ tự listID
  return listID.map(id => 
    tracks.find(track => track._id.toString() === id)
  ).filter(Boolean);
}

export default {getTrackByID, getTrackByListID}

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
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true, encoding: 'utf-8' });

    // --- Lấy metadata từ ffprobe ---
    const out = execSync(`ffprobe -v quiet -print_format json -show_format -show_streams "${inputPath}"`).toString();
    const json = JSON.parse(out);
    const format = json.format || {};
    const duration = format.duration ? parseFloat(format.duration) : 0;
    const bitrate = format.bit_rate ? parseInt(format.bit_rate) / 1000 : 0; // kbps

    console.log(`🎵 Input Duration: ${duration.toFixed(2)}s | Bitrate: ${bitrate.toFixed(1)} kbps`);

    // --- Xác định bitrate output ---
    let targetBitrate;

    if (bitrate < 96) targetBitrate = "96k";
    else if (bitrate <= 192) targetBitrate = `${Math.round(bitrate)}k`; // giữ nguyên bitrate
    else targetBitrate = "192k"; // giới hạn tối đa (để giảm dung lượng)

    console.log(`⚙️ Output bitrate chọn: ${targetBitrate}`);

    // --- Cấu hình ffmpeg ---
    const args = [
      "-i", inputPath,
      "-map", "0:a:0",            // chỉ lấy track audio đầu tiên
      "-c:v", "copy",             // bỏ qua video
      "-c:a", "aac",              // encode sang AAC cho HLS
      "-b:a", targetBitrate,      // bitrate động
      "-hls_time", "3",           // mỗi segment 3s
      "-hls_list_size", "0",      // giữ toàn bộ segment
      "-f", "hls",                // định dạng HLS
      `${outputDir}/${baseName}.m3u8`,
    ];

    const ffmpeg = spawn("ffmpeg", args, { shell: true });

    // Check lỗi ffmpeg
    // ffmpeg.stderr.on("data", (data) => {
    //   console.error("ffmpeg error:", data.toString());
    // });

    ffmpeg.on("close", (code) => {
      if (code === 0) resolve({outputDir, duration});
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
  console.log(`🎉 Đã upload thành công trong ${totalTime}s`);

  return {
    folderKey,
    m3u8Url: `${folderKey}/${baseName}.m3u8`,
  };
};

export const deleteFolder = async (folderPath) => {
  // folderPath ví dụ: "songs/myfolder/"
  const listCmd = new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: folderPath,
  });

  const listedObjects = await client.send(listCmd);

  if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
    console.log("Folder trống hoặc không tồn tại");
    return;
  }

  const deleteParams = {
    Bucket: BUCKET,
    Delete: {
      Objects: listedObjects.Contents.map((obj) => ({ Key: obj.Key })),
      Quiet: false,
    },
  };

  const deleteCmd = new DeleteObjectsCommand(deleteParams);
  await client.send(deleteCmd);

  console.log(`Đã xóa xong folder: ${folderPath}`);
};