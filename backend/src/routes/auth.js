const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getConfig, updateConfig } = require('../config');
const { authenticate, requireAdmin, JWT_SECRET } = require('../middleware/auth');
const { authLimiter } = require('../middleware/security');

router.post('/login', authLimiter, (req, res) => {
  const { username, password, isGuest } = req.body;
  const config = getConfig();

  if (isGuest) {
    const token = jwt.sign(
      { username: 'guest_user', role: 'guest' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    return res.json({ token, role: 'guest', username: 'guest_user' });
  }

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  if (username !== config.adminUsername) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const validPassword = bcrypt.compareSync(password, config.adminPasswordHash);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = jwt.sign(
    { username: config.adminUsername, role: 'admin' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ token, role: 'admin', username: config.adminUsername });
});

router.get('/status', (req, res) => {
  const config = getConfig();
  res.json({
    authEnabled: config.authEnabled,
    adminUsername: config.adminUsername
  });
});

router.post('/change-password', authenticate, requireAdmin, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const config = getConfig();

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  const validPassword = bcrypt.compareSync(currentPassword, config.adminPasswordHash);
  if (!validPassword) {
    return res.status(400).json({ error: 'Incorrect current password' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long' });
  }

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(newPassword, salt);

  updateConfig({ adminPasswordHash: hash });

  res.json({ message: 'Password changed successfully' });
});

module.exports = router;
