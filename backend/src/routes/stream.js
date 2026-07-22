const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { validatePath } = require('../middleware/security');
const { authenticate } = require('../middleware/auth');
const { generateThumbnail, getThumbnailHash, cacheDir } = require('../services/thumbnail');

const playbackDbPath = path.join(__dirname, '..', '..', 'playback.json');

let playbackDb = {};
try {
  if (fs.existsSync(playbackDbPath)) {
    playbackDb = JSON.parse(fs.readFileSync(playbackDbPath, 'utf8'));
  }
} catch (e) {
  console.error('Error loading playback progress database:', e);
}

function savePlaybackProgress() {
  try {
    fs.writeFileSync(playbackDbPath, JSON.stringify(playbackDb, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving playback progress database:', e);
  }
}

router.get('/video', authenticate, (req, res) => {
  const relativePath = req.query.path;
  if (!relativePath) {
    return res.status(400).json({ error: 'Path parameter is required' });
  }

  const { safe, absolutePath } = validatePath(relativePath);
  if (!safe) {
    return res.status(403).json({ error: 'Access denied or invalid file path' });
  }

  let stat;
  try {
    stat = fs.statSync(absolutePath);
  } catch (e) {
    return res.status(404).json({ error: 'File not found' });
  }

  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize || end >= fileSize) {
      res.setHeader('Content-Range', `bytes */${fileSize}`);
      return res.status(416).send('Requested range not satisfiable');
    }

    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(absolutePath, { start, end });
    
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4'
    };

    res.writeHead(206, head);
    file.pipe(res);
    
    file.on('error', (err) => {
      console.error('Streaming chunk error:', err);
    });
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(200, head);
    fs.createReadStream(absolutePath).pipe(res);
  }
});

const defaultSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" width="320" height="180">
  <rect width="320" height="180" fill="#f3f4f6" rx="8" />
  <rect width="80" height="80" x="120" y="35" rx="40" fill="#e5e7eb" />
  <path d="M145 60 L145 90 L175 75 Z" fill="#9ca3af" />
  <text x="50%" y="145" font-family="system-ui, sans-serif" font-size="12" fill="#6b7280" text-anchor="middle">No Thumbnail Preview</text>
</svg>
`.trim();

router.get('/thumbnail', authenticate, async (req, res) => {
  const relativePath = req.query.path;
  if (!relativePath) {
    return res.status(400).json({ error: 'Path parameter is required' });
  }

  const { safe } = validatePath(relativePath);
  if (!safe) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const thumbName = await generateThumbnail(relativePath);
  
  if (thumbName) {
    const thumbPath = path.join(cacheDir, thumbName);
    if (fs.existsSync(thumbPath)) {
      return res.sendFile(thumbPath);
    }
  }

  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(defaultSvg);
});

router.post('/progress', authenticate, (req, res) => {
  const { path: relPath, time, duration } = req.body;
  const username = req.user.username;

  if (!relPath || time === undefined || !duration) {
    return res.status(400).json({ error: 'Path, time, and duration are required' });
  }

  if (!playbackDb[username]) {
    playbackDb[username] = {};
  }

  playbackDb[username][relPath] = {
    time: parseFloat(time),
    duration: parseFloat(duration),
    updatedAt: new Date().toISOString()
  };

  savePlaybackProgress();
  res.json({ message: 'Playback progress updated' });
});

router.get('/progress', authenticate, (req, res) => {
  const relPath = req.query.path;
  const username = req.user.username;

  if (!relPath) {
    return res.status(400).json({ error: 'Path query is required' });
  }

  const userProgress = playbackDb[username] || {};
  res.json(userProgress[relPath] || { time: 0, duration: 0 });
});

router.get('/continue-watching', authenticate, (req, res) => {
  const username = req.user.username;
  const userProgress = playbackDb[username] || {};
  
  const items = Object.entries(userProgress)
    .map(([relPath, progress]) => ({
      relativePath: relPath,
      ...progress
    }))
    .filter(item => {
      const percent = (item.time / item.duration) * 100;
      return percent > 1 && percent < 95;
    })
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 10);

  res.json(items);
});

router.get('/subtitles', authenticate, (req, res) => {
  const relativePath = req.query.path;
  if (!relativePath) {
    return res.status(400).json({ error: 'Path parameter is required' });
  }

  const { safe, absolutePath } = validatePath(relativePath);
  if (!safe) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const ext = path.extname(absolutePath);
  const basePath = absolutePath.substring(0, absolutePath.length - ext.length);
  
  const vttPath = basePath + '.vtt';
  const srtPath = basePath + '.srt';

  if (fs.existsSync(vttPath)) {
    res.setHeader('Content-Type', 'text/vtt');
    return res.sendFile(vttPath);
  } else if (fs.existsSync(srtPath)) {
    try {
      const srtContent = fs.readFileSync(srtPath, 'utf8');
      const vttContent = 'WEBVTT\n\n' + srtContent
        .replace(/\r/g, '')
        .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');

      res.setHeader('Content-Type', 'text/vtt');
      return res.send(vttContent);
    } catch (err) {
      console.error('Failed to convert SRT to VTT:', err);
      return res.status(500).send('Error reading subtitle file');
    }
  }

  res.setHeader('Content-Type', 'text/vtt');
  res.send('WEBVTT\n\n1\n00:00:00.000 --> 00:00:01.000\n[No Subtitles Found]');
});

module.exports = router;
