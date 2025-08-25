import express from "express";
import multer from "multer";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import fs from "fs";
import path from "path";

const app = express();
const upload = multer({ dest: "/tmp" });
ffmpeg.setFfmpegPath(ffmpegPath);

app.post("/api/fix", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const inputPath = req.file.path;
  const fileName = "fixed_" + Date.now() + ".mp4";
  const outputPath = path.join("/tmp", fileName);
  const publicPath = path.join(process.cwd(), "public", "fixed", fileName);

  ffmpeg(inputPath)
    .videoCodec("libx264")
    .audioCodec("aac")
    .outputOptions([
      "-preset fast",
      "-crf 23",
      "-movflags +frag_keyframe+empty_moov",
      "-f mp4"
    ])
    .on("end", () => {
      fs.copyFileSync(outputPath, publicPath);
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
      res.json({ url: `/fixed/${fileName}` });
    })
    .on("error", (err) => {
      console.error("FFmpeg error:", err);
      res.status(500).json({ error: "FFmpeg error: " + err.message });
    })
    .save(outputPath);
});

export default app;
