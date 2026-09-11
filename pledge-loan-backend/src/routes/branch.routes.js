const express = require('express');
const router = express.Router();
const branchController = require('../controllers/branch.controller');
const { authenticateToken, authorizeAdmin, authorizeManagement } = require('../middleware/auth.middleware');

router.get('/', authenticateToken, authorizeManagement, branchController.listBranches);
router.get('/:id', authenticateToken, branchController.getBranchById);
router.post('/', authenticateToken, authorizeAdmin, branchController.createBranch);
router.put('/:id', authenticateToken, authorizeAdmin, branchController.updateBranch);

module.exports = router;