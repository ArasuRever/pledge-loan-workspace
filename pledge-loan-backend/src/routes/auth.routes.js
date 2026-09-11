const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticateToken, authorizeAdmin } = require('../middleware/auth.middleware');

router.get('/health', authController.checkHealth);
router.post('/auth/login', authController.login);

// User Management
router.get('/users', authenticateToken, authorizeAdmin, authController.listUsers);
router.post('/users/create', authenticateToken, authorizeAdmin, authController.createUser);
router.put('/users/change-password', authenticateToken, authorizeAdmin, authController.changePassword);
router.put('/users/:id', authenticateToken, authorizeAdmin, authController.updateUser);
router.delete('/users/:id', authenticateToken, authorizeAdmin, authController.deleteUser);

module.exports = router;