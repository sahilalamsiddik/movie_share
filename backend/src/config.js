const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const configPath = path.join(__dirname, '..', 'config.json');

const defaultConfig = {
  mediaRoot: 'D:\\New folder\\Movies',
  port: 5000,
  authEnabled: true,
  adminUsername: 'admin',
  adminPasswordHash: '',
  tunnelService: 'localtunnel',
  cloudflareBinaryPath: '',
  ffmpegPath: '',
  ffprobePath: '',
  ipWhitelist: [],
  ipBlacklist: []
};

function generateDefaultHash() {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync('admin123', salt);
}

function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf8');
      const loaded = JSON.parse(raw);
      return { ...defaultConfig, ...loaded };
    }
  } catch (err) {
    console.error('Error loading config, using defaults:', err);
  }

  const config = { ...defaultConfig };
  config.adminPasswordHash = generateDefaultHash();
  saveConfig(config);
  return config;
}

function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error saving config:', err);
    return false;
  }
}

let currentConfig = loadConfig();

module.exports = {
  getConfig: () => currentConfig,
  updateConfig: (newConfig) => {
    currentConfig = { ...currentConfig, ...newConfig };
    saveConfig(currentConfig);
    return currentConfig;
  },
  configPath
};
