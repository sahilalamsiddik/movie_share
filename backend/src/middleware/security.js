const path = require('path');
const rateLimit = require('express-rate-limit');
const { getConfig } = require('../config');
const { logToDashboard } = require('../services/scanner');

function ipMatches(clientIp, ipList) {
  if (!ipList || ipList.length === 0) return false;
  return ipList.some(ip => ip === clientIp);
}

function ipFilter(req, res, next) {
  const config = getConfig();
  const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '')
    .split(',')[0].trim();

  const ipClean = clientIp.startsWith('::ffff:') ? clientIp.substring(7) : clientIp;

  const whitelist = config.ipWhitelist || [];
  const blacklist = config.ipBlacklist || [];

  if (ipMatches(ipClean, blacklist)) {
    logToDashboard('Security', `Blocked request from blacklisted IP: ${ipClean}`, 'warning');
    return res.status(403).send('Access Denied: IP Blacklisted');
  }

  if (whitelist.length > 0 && !ipMatches(ipClean, whitelist) && ipClean !== '127.0.0.1' && ipClean !== '::1') {
    logToDashboard('Security', `Blocked request from non-whitelisted IP: ${ipClean}`, 'warning');
    return res.status(403).send('Access Denied: IP not in whitelist');
  }

  next();
}

function validatePath(relativePath) {
  const config = getConfig();
  const root = path.resolve(config.mediaRoot);
  
  if (!relativePath) return { safe: false };

  const target = path.resolve(root, relativePath);
  const relative = path.relative(root, target);
  
  const isSafe = target === root || (!relative.startsWith('..') && !path.isAbsolute(relative));
  
  if (isSafe && fsExistsSafe(target)) {
    return { safe: true, absolutePath: target };
  }
  
  return { safe: false };
}

function fsExistsSafe(p) {
  const fs = require('fs');
  return fs.existsSync(p);
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many login attempts, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  ipFilter,
  validatePath,
  authLimiter,
  apiLimiter
};
