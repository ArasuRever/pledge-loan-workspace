const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customer.controller');
const { authenticateToken, authorizeAdmin, authorizeManagement } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

router.get('/', authenticateToken, customerController.listCustomers);
router.get('/:id', authenticateToken, customerController.getCustomerById);
router.post('/', authenticateToken, upload.single('photo'), customerController.createCustomer);
router.put('/:id', authenticateToken, upload.single('photo'), customerController.updateCustomer);
router.delete('/:id', authenticateToken, authorizeManagement, customerController.deleteCustomer);
router.get('/:id/loans', authenticateToken, customerController.getCustomerLoans);
router.post('/:id/restore', authenticateToken, authorizeManagement, customerController.restoreCustomer);
router.delete('/:id/permanent-delete', authenticateToken, authorizeAdmin, customerController.permanentDeleteCustomer);

module.exports = router;