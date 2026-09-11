const express = require('express');
const router = express.Router();
const recycleBinController = require('../controllers/recycleBin.controller');
const { authenticateToken, authorizeManagement } = require('../middleware/auth.middleware');

router.get('/deleted', authenticateToken, authorizeManagement, recycleBinController.getDeletedItems);

module.exports = router;