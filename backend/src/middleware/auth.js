const jwt = require('jsonwebtoken');
const { getConfig } = require('../config');

const JWT_SECRET = process.env.JWT_SECRET || require('crypto').randomBytes(32).toString('hex');

function authenticate(req, res, next) {
  const config = getConfig();

  if (!config.authEnabled) {
    req.user = { role: 'admin', username: 'guest-admin' };
    return next();
  }

  let token = req.headers['authorization'];
  if (token && token.startsWith('Bearer ')) {
    token = token.slice(7, token.length);
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Access Denied: No token provided' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Access Denied: Invalid token' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Access Denied: Unauthenticated' });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access Denied: Admin role required' });
  }
  
  next();
}

module.exports = {
  authenticate,
  requireAdmin,
  JWT_SECRET
};
