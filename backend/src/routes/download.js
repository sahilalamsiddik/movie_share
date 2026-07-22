const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const { validatePath } = require('../middleware/security');
const { authenticate } = require('../middleware/auth');
const { logToDashboard } = require('../services/scanner');

router.get('/file', authenticate, (req, res) => {
  const relativePath = req.query.path;
  if (!relativePath) {
    return res.status(400).json({ error: 'Path parameter is required' });
  }

  const { safe, absolutePath } = validatePath(relativePath);
  if (!safe) {
    return res.status(403).json({ error: 'Access denied or invalid file path' });
  }

  try {
    const stat = fs.statSync(absolutePath);
    if (stat.isDirectory()) {
      return res.status(400).json({ error: 'Cannot download directory as a single file. Use the folder download endpoint.' });
    }

    const filename = path.basename(absolutePath);
    logToDashboard('Download', `Starting download: ${relativePath} (${(stat.size / (1024 * 1024)).toFixed(2)} MB)`);
    
    res.download(absolutePath, filename, (err) => {
      if (err) {
        if (res.headersSent) {
          console.error('Download stream interrupted:', err);
        } else {
          res.status(500).json({ error: 'Download failed' });
        }
      } else {
        logToDashboard('Download', `Completed download: ${relativePath}`);
      }
    });
  } catch (err) {
    res.status(500).json({ error: `Download failed: ${err.message}` });
  }
});

router.get('/folder', authenticate, (req, res) => {
  const relativePath = req.query.path || '';
  
  const { safe, absolutePath } = validatePath(relativePath);
  if (!safe) {
    return res.status(403).json({ error: 'Access denied or invalid folder path' });
  }

  try {
    const stat = fs.statSync(absolutePath);
    if (!stat.isDirectory()) {
      return res.status(400).json({ error: 'Target path is not a directory.' });
    }

    const folderName = relativePath ? path.basename(absolutePath) : 'media-library';
    logToDashboard('Download', `Zipping and downloading folder: ${relativePath || 'root'}`);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${folderName}.zip"`);

    const archive = archiver('zip', { zlib: { level: 5 } });

    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn('Archiver warning:', err);
      } else {
        throw err;
      }
    });

    archive.on('error', (err) => {
      console.error('Archiver error:', err);
      if (!res.headersSent) {
        res.status(500).send({ error: 'Failed to create zip archive' });
      }
    });

    archive.pipe(res);
    archive.directory(absolutePath, false);

    archive.finalize().then(() => {
      logToDashboard('Download', `Completed folder zip download: ${relativePath || 'root'}`);
    });
  } catch (err) {
    console.error('Folder zip error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: `Failed to zip folder: ${err.message}` });
    }
  }
});

module.exports = router;
