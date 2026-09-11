const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { authenticateToken, authorizeManagement } = require('../middleware/auth.middleware');

router.get('/financial-summary', authenticateToken, authorizeManagement, reportController.getFinancialSummary);
router.get('/day-book', authenticateToken, authorizeManagement, reportController.getDayBook);

module.exports = router;