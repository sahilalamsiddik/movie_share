const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { getConfig } = require('../config');
const { getLibrary, triggerReScan, getSystemLogs, logToDashboard } = require('../services/scanner');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { validatePath } = require('../middleware/security');

function getParentDir(relPath) {
  if (!relPath) return null;
  const parts = relPath.split('/');
  parts.pop();
  return parts.join('/');
}

router.get('/browse', authenticate, (req, res) => {
  const currentPath = (req.query.path || '').replace(/\\/g, '/');
  const search = req.query.search || '';
  const sortBy = req.query.sortBy || 'name';
  const sortOrder = req.query.sortOrder || 'asc';

  const library = getLibrary();
  let items = [];

  if (search) {
    const searchLower = search.toLowerCase();
    items = Object.values(library.files).filter(file => {
      return file.name.toLowerCase().includes(searchLower) ||
             file.relativePath.toLowerCase().includes(searchLower) ||
             (file.extension && file.extension.includes(searchLower));
    });
  } else {
    items = Object.values(library.files).filter(file => {
      const parent = getParentDir(file.relativePath);
      if (currentPath === '') {
        return parent === '' || parent === null;
      }
      return parent === currentPath;
    });
  }

  items.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;

    let comparison = 0;
    if (sortBy === 'size') {
      comparison = a.size - b.size;
    } else if (sortBy === 'mtime') {
      comparison = new Date(a.mtime) - new Date(b.mtime);
    } else if (sortBy === 'type') {
      const typeA = a.isDirectory ? 'directory' : (a.type || 'other');
      const typeB = b.isDirectory ? 'directory' : (b.type || 'other');
      comparison = typeA.localeCompare(typeB);
    } else {
      comparison = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    }

    return sortOrder === 'desc' ? -comparison : comparison;
  });

  res.json({
    currentPath,
    breadcrumbs: currentPath ? currentPath.split('/') : [],
    items
  });
});

router.delete('/delete', authenticate, requireAdmin, (req, res) => {
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
      fs.rmSync(absolutePath, { recursive: true, force: true });
      logToDashboard('Library', `Deleted folder: ${relativePath}`);
    } else {
      fs.unlinkSync(absolutePath);
      logToDashboard('Library', `Deleted file: ${relativePath}`);
    }

    triggerReScan();
    res.json({ message: 'Item deleted successfully' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: `Failed to delete item: ${err.message}` });
  }
});

router.get('/stats', authenticate, async (req, res) => {
  const library = getLibrary();
  const config = getConfig();

  let diskSpace = { total: 0, free: 0, used: 0 };
  
  try {
    const driveLetter = path.resolve(config.mediaRoot).substring(0, 2);
    if (driveLetter && driveLetter[1] === ':') {
      const command = `powershell "Get-CimInstance -ClassName Win32_LogicalDisk -Filter \\"DeviceID='${driveLetter}'\\" | Select-Object Size, FreeSpace | ConvertTo-Json"`;
      
      await new Promise((resolve) => {
        exec(command, (error, stdout) => {
          if (!error && stdout) {
            try {
              const data = JSON.parse(stdout);
              if (data && data.Size) {
                diskSpace.total = data.Size;
                diskSpace.free = data.FreeSpace;
                diskSpace.used = data.Size - data.FreeSpace;
              }
            } catch (jsonErr) {}
          }
          resolve();
        });
      });
    }
  } catch (err) {
    console.error('Failed to get disk space:', err);
  }

  res.json({
    ...library.stats,
    diskSpace
  });
});

router.post('/scan', authenticate, requireAdmin, async (req, res) => {
  try {
    await triggerReScan();
    res.json({ message: 'Scan initiated successfully' });
  } catch (err) {
    res.status(500).json({ error: `Scan failed: ${err.message}` });
  }
});

router.get('/logs', authenticate, requireAdmin, (req, res) => {
  res.json({ logs: getSystemLogs() });
});

module.exports = router;
