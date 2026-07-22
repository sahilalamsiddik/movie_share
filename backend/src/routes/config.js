const express = require('express');
const router = express.Router();
const fs = require('fs');
const { getConfig, updateConfig } = require('../config');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { initWatcher, scanLibrary, logToDashboard } = require('../services/scanner');
const { startTunnel } = require('../services/tunnel');

router.get('/', authenticate, requireAdmin, (req, res) => {
  const config = getConfig();
  const safeConfig = { ...config };
  delete safeConfig.adminPasswordHash;
  res.json(safeConfig);
});

router.post('/', authenticate, requireAdmin, async (req, res) => {
  const updates = req.body;
  const configBefore = getConfig();

  if (updates.mediaRoot && !fs.existsSync(updates.mediaRoot)) {
    return res.status(400).json({ error: `Directory path does not exist: ${updates.mediaRoot}` });
  }

  if (updates.port && (updates.port < 1024 || updates.port > 65535)) {
    return res.status(400).json({ error: 'Port must be between 1024 and 65535' });
  }

  const updated = updateConfig(updates);
  logToDashboard('System', 'Configuration updated by administrator.');

  let scannerReinitialized = false;
  let tunnelRestarted = false;

  if (updates.mediaRoot && updates.mediaRoot !== configBefore.mediaRoot) {
    logToDashboard('System', `Media root path changed to: ${updates.mediaRoot}. Re-initializing scanner...`);
    initWatcher();
    scanLibrary();
    scannerReinitialized = true;
  }

  if (
    (updates.port && updates.port !== configBefore.port) ||
    (updates.tunnelService && updates.tunnelService !== configBefore.tunnelService) ||
    (updates.cloudflareBinaryPath !== undefined && updates.cloudflareBinaryPath !== configBefore.cloudflareBinaryPath)
  ) {
    logToDashboard('System', 'Network/Tunnel settings updated. Restarting tunnel...');
    startTunnel(updated.port).catch(err => {
      console.error('Failed to restart tunnel after settings update:', err);
    });
    tunnelRestarted = true;
  }

  const safeConfig = { ...updated };
  delete safeConfig.adminPasswordHash;

  res.json({
    message: 'Configuration updated successfully',
    config: safeConfig,
    actionsTriggered: {
      scannerReinitialized,
      tunnelRestarted
    }
  });
});

module.exports = router;
