const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller');
const { authenticateToken, authorizeAdmin } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

// Must be '/' because server.js already prefixes with '/api/settings'
router.get('/', settingsController.getSettings);
router.put('/', authenticateToken, authorizeAdmin, upload.single('logo'), settingsController.updateSettings);

module.exports = router;