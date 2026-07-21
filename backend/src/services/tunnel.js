const { spawn } = require('child_process');
const localtunnel = require('localtunnel');
const { getConfig } = require('../config');
const { logToDashboard } = require('./scanner');

let ltInstance = null;
let cfProcess = null;
let currentUrl = null;
let tunnelStatus = 'disconnected';
let ioInstance = null;

function setSocketIO(io) {
  ioInstance = io;
}

function emitStatus() {
  if (ioInstance) {
    ioInstance.emit('tunnel-status', {
      status: tunnelStatus,
      url: currentUrl
    });
  }
}

async function startTunnel(port) {
  await stopTunnel();

  const config = getConfig();
  const service = config.tunnelService || 'localtunnel';
  
  tunnelStatus = 'connecting';
  currentUrl = null;
  emitStatus();

  logToDashboard('Tunnel', `Starting public shareable link using ${service}...`);

  if (service === 'localtunnel') {
    try {
      ltInstance = await localtunnel({ port });
      currentUrl = ltInstance.url;
      tunnelStatus = 'connected';
      emitStatus();
      logToDashboard('Tunnel', `Public URL generated successfully: ${currentUrl}`);
      
      ltInstance.on('close', () => {
        logToDashboard('Tunnel', 'Localtunnel connection closed.');
        tunnelStatus = 'disconnected';
        currentUrl = null;
        emitStatus();
      });
      
      ltInstance.on('error', (err) => {
        console.error('Localtunnel error:', err);
        logToDashboard('Tunnel', `Localtunnel error: ${err.message}`, 'error');
        tunnelStatus = 'error';
        emitStatus();
      });
    } catch (err) {
      console.error('Failed to start Localtunnel:', err);
      logToDashboard('Tunnel', `Failed to start Localtunnel: ${err.message}`, 'error');
      tunnelStatus = 'error';
      emitStatus();
    }
  } else if (service === 'cloudflare') {
    let binary = config.cloudflareBinaryPath || 'cloudflared';

    logToDashboard('Tunnel', `Spawning Cloudflare Tunnel process: ${binary}`);
    const args = ['tunnel', '--url', `http://localhost:${port}`];
    
    try {
      cfProcess = spawn(binary, args, { shell: true });
      
      cfProcess.stdout.on('data', (data) => parseCloudflareOutput(data.toString()));
      cfProcess.stderr.on('data', (data) => parseCloudflareOutput(data.toString()));

      cfProcess.on('close', (code) => {
        logToDashboard('Tunnel', `Cloudflare Tunnel process exited with code ${code}`);
        cfProcess = null;
        tunnelStatus = 'disconnected';
        currentUrl = null;
        emitStatus();
      });

      cfProcess.on('error', (err) => {
        console.error('Cloudflare Tunnel failed to start:', err);
        logToDashboard('Tunnel', `Cloudflare Tunnel execution error: ${err.message}`, 'error');
        tunnelStatus = 'error';
        emitStatus();
      });
    } catch (err) {
      logToDashboard('Tunnel', `Error spawning cloudflared: ${err.message}`, 'error');
      tunnelStatus = 'error';
      emitStatus();
    }
  }
}

function parseCloudflareOutput(text) {
  const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
  if (match) {
    currentUrl = match[0];
    tunnelStatus = 'connected';
    emitStatus();
    logToDashboard('Tunnel', `Cloudflare Tunnel active! Public URL: ${currentUrl}`);
  }
}

async function stopTunnel() {
  if (ltInstance) {
    try { await ltInstance.close(); } catch (e) {}
    ltInstance = null;
  }
  if (cfProcess) {
    try { cfProcess.kill(); } catch (e) {}
    cfProcess = null;
  }
  currentUrl = null;
  tunnelStatus = 'disconnected';
  emitStatus();
}

module.exports = {
  startTunnel,
  stopTunnel,
  setSocketIO,
  getTunnelInfo: () => ({ status: tunnelStatus, url: currentUrl }),
  emitStatus
};
