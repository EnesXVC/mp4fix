const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const ffmpegPath = require('ffmpeg-static'); 

const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 200 * 1024 * 1024 } // 200MB
});

ffmpeg.setFfmpegPath(ffmpegPath);

app.post('/fix', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded');

  const inputPath = req.file.path;
  const outputPath = path.join('uploads', 'fixed_' + Date.now() + '.mp4');

  ffmpeg(inputPath)
    .videoCodec('libx264')
    .audioCodec('aac')
    .outputOptions([
      '-preset fast',
      '-crf 23',
      '-movflags +frag_keyframe+empty_moov',
      '-f mp4'
    ])
    .on('start', (cmd) => console.log('FFmpeg started:', cmd))
    .on('progress', (p) => console.log(`Progress: ${p.percent ? p.percent.toFixed(2) : 0}%`))
    .on('end', () => {
      console.log('FFmpeg finished:', outputPath);
      res.download(outputPath, 'fixed_video.mp4', (err) => {
        if (err) console.error('Download error:', err);
        fs.unlink(inputPath, () => {});
        fs.unlink(outputPath, () => {});
      });
    })
    .on('error', (err) => {
      console.error('FFmpeg error:', err);
      fs.unlink(inputPath, () => {});
      if (fs.existsSync(outputPath)) fs.unlink(outputPath, () => {});
      res.status(500).send('FFmpeg error: ' + err.message);
    })
    .save(outputPath);
});

app.get('/health', (req, res) => {
  res.send('server is running');
});

app.get('/ffmpeg-info', (req, res) => {
  res.send(`ffmpeg path in use: ${ffmpegPath}`);
});

app.get('/', (req, res) => {
  res.send(`
    <h1>Video Fix Server</h1>
    <p>Endpoints:</p>
    <ul>
      <li><a href="/health">/health</a></li>
      <li><a href="/ffmpeg-info">/ffmpeg-info</a></li>
      <li>POST /fix - Upload video</li>
    </ul>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
