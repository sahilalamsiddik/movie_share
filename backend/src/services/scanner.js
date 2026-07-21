const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const ffmpeg = require('fluent-ffmpeg');
const mime = require('mime-types');
const { getConfig } = require('../config');

let libraryCache = {
  files: {},
  stats: {
    totalFiles: 0,
    totalStorage: 0,
    totalVideos: 0,
    totalFolders: 0,
    recentlyAdded: []
  }
};

let watcher = null;
let ioInstance = null;
let isScanning = false;

function updateFfmpegPaths() {
  const config = getConfig();
  if (config.ffmpegPath && fs.existsSync(config.ffmpegPath)) {
    ffmpeg.setFfmpegPath(config.ffmpegPath);
  }
  if (config.ffprobePath && fs.existsSync(config.ffprobePath)) {
    ffmpeg.setFfprobePath(config.ffprobePath);
  }
}

function getFileType(ext) {
  ext = ext.toLowerCase().replace(/^\./, '');
  if (['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv', 'wmv', 'm4v'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac'].includes(ext)) return 'audio';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
  if (['pdf', 'epub', 'txt', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) return 'document';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
  return 'other';
}

function getVideoMetadata(absolutePath) {
  return new Promise((resolve) => {
    updateFfmpegPaths();
    ffmpeg.ffprobe(absolutePath, (err, metadata) => {
      if (err || !metadata || !metadata.format) {
        return resolve({ duration: null, resolution: null });
      }
      const duration = metadata.format.duration || null;
      let resolution = null;
      if (metadata.streams) {
        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        if (videoStream && videoStream.width && videoStream.height) {
          resolution = `${videoStream.width}x${videoStream.height}`;
        }
      }
      resolve({ duration, resolution });
    });
  });
}

async function scanLibrary() {
  if (isScanning) return;
  isScanning = true;
  console.log('Starting directory scan...');
  logToDashboard('System', 'Starting library media scan...');

  const config = getConfig();
  const root = config.mediaRoot;

  if (!fs.existsSync(root)) {
    console.error(`Media root directory does not exist: ${root}`);
    logToDashboard('System', `Error: Media root path "${root}" does not exist.`, 'error');
    isScanning = false;
    return;
  }

  const newFiles = {};
  let folderCount = 0;
  let fileCount = 0;
  let totalSize = 0;
  let videoCount = 0;
  const allFileObjects = [];

  async function walk(dir) {
    let list;
    try {
      list = fs.readdirSync(dir);
    } catch (e) {
      console.error(`Failed to read dir: ${dir}`, e);
      return;
    }

    for (const name of list) {
      if (name.startsWith('.') || name === 'System Volume Information') continue;
      
      const fullPath = path.join(dir, name);
      let stat;
      try {
        stat = fs.statSync(fullPath);
      } catch (e) {
        continue;
      }

      const relPath = path.relative(root, fullPath).replace(/\\/g, '/');

      if (stat.isDirectory()) {
        folderCount++;
        newFiles[relPath] = {
          name,
          relativePath: relPath,
          isDirectory: true,
          size: 0,
          birthtime: stat.birthtime,
          mtime: stat.mtime
        };
        await walk(fullPath);
      } else {
        fileCount++;
        totalSize += stat.size;
        const ext = path.extname(name);
        const type = getFileType(ext);
        if (type === 'video') videoCount++;

        const fileObj = {
          name,
          relativePath: relPath,
          isDirectory: false,
          size: stat.size,
          mimeType: mime.lookup(fullPath) || 'application/octet-stream',
          extension: ext.toLowerCase(),
          type,
          birthtime: stat.birthtime,
          mtime: stat.mtime,
          duration: null,
          resolution: null
        };

        if (type === 'video') {
          const cached = libraryCache.files[relPath];
          if (cached && cached.duration && cached.mtime && new Date(cached.mtime).getTime() === stat.mtime.getTime()) {
            fileObj.duration = cached.duration;
            fileObj.resolution = cached.resolution;
          } else {
            const meta = await Promise.race([
              getVideoMetadata(fullPath),
              new Promise(r => setTimeout(() => r({ duration: null, resolution: null }), 2000))
            ]);
            fileObj.duration = meta.duration;
            fileObj.resolution = meta.resolution;
          }
        }

        newFiles[relPath] = fileObj;
        allFileObjects.push(fileObj);
      }
    }
  }

  await walk(root);

  const recentlyAdded = [...allFileObjects]
    .sort((a, b) => new Date(b.birthtime) - new Date(a.birthtime))
    .slice(0, 25);

  libraryCache = {
    files: newFiles,
    stats: {
      totalFiles: fileCount,
      totalStorage: totalSize,
      totalVideos: videoCount,
      totalFolders: folderCount,
      recentlyAdded
    }
  };

  isScanning = false;
  console.log(`Scan completed. Found ${fileCount} files, ${folderCount} folders.`);
  logToDashboard('System', `Library scan completed. Found ${fileCount} files and ${folderCount} folders.`);
  
  if (ioInstance) {
    ioInstance.emit('library-updated', libraryCache);
  }
}

function initWatcher() {
  if (watcher) {
    watcher.close();
  }

  const config = getConfig();
  const root = config.mediaRoot;

  if (!fs.existsSync(root)) {
    return;
  }

  watcher = chokidar.watch(root, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: true,
    depth: 99
  });

  const debouncedScan = debounce(() => {
    scanLibrary();
  }, 3000);

  watcher
    .on('add', () => debouncedScan())
    .on('change', () => debouncedScan())
    .on('unlink', () => debouncedScan())
    .on('addDir', () => debouncedScan())
    .on('unlinkDir', () => debouncedScan());
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

const systemLogs = [];
function logToDashboard(source, message, type = 'info') {
  const logEntry = {
    timestamp: new Date().toISOString(),
    source,
    message,
    type
  };
  systemLogs.push(logEntry);
  if (systemLogs.length > 500) {
    systemLogs.shift();
  }
  if (ioInstance) {
    ioInstance.emit('new-log', logEntry);
  }
}

function getSystemLogs() {
  return systemLogs;
}

module.exports = {
  scanLibrary,
  initWatcher,
  getLibrary: () => libraryCache,
  setSocketIO: (io) => {
    ioInstance = io;
  },
  logToDashboard,
  getSystemLogs,
  triggerReScan: async () => {
    await scanLibrary();
  }
};
