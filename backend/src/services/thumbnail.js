const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ffmpeg = require('fluent-ffmpeg');
const { getConfig } = require('../config');

const cacheDir = path.join(__dirname, '..', '..', 'cache', 'thumbnails');

if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

function getThumbnailHash(relativePath) {
  return crypto.createHash('md5').update(relativePath).digest('hex') + '.jpg';
}

function updateFfmpegPaths() {
  const config = getConfig();
  if (config.ffmpegPath && fs.existsSync(config.ffmpegPath)) {
    ffmpeg.setFfmpegPath(config.ffmpegPath);
  }
}

function generateThumbnail(relativePath) {
  return new Promise((resolve) => {
    updateFfmpegPaths();
    
    const config = getConfig();
    const videoPath = path.join(config.mediaRoot, relativePath);
    const thumbName = getThumbnailHash(relativePath);
    const outputPath = path.join(cacheDir, thumbName);

    if (fs.existsSync(outputPath)) {
      return resolve(thumbName);
    }

    if (!fs.existsSync(videoPath)) {
      return resolve(null);
    }

    ffmpeg(videoPath)
      .screenshots({
        timestamps: ['10%', '00:00:10', 10],
        folder: cacheDir,
        filename: thumbName,
        size: '320x180'
      })
      .on('end', () => resolve(thumbName))
      .on('error', (err) => {
        console.error(`Failed to generate thumbnail for ${relativePath}:`, err.message);
        resolve(null);
      });
  });
}

module.exports = {
  generateThumbnail,
  getThumbnailHash,
  cacheDir
};
