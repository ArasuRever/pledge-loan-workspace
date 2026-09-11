const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transaction.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

router.post('/', authenticateToken, transactionController.createTransaction);
router.delete('/:id', authenticateToken, transactionController.deleteTransaction);

module.exports = router;