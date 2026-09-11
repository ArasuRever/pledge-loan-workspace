const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loan.controller');
const { authenticateToken, authorizeAdmin, authorizeManagement } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

// Specific endpoints
router.get('/', authenticateToken, loanController.listLoans);
router.get('/recent/created', authenticateToken, loanController.getRecentCreated);
router.get('/recent/closed', authenticateToken, loanController.getRecentClosed);
router.get('/overdue', authenticateToken, loanController.getOverdueLoans);
router.get('/find-by-book-number/:bookNumber', authenticateToken, loanController.findByBookNumber);

// Parametric endpoints (upload.any() allows multiple individual item photos)
router.get('/:id', authenticateToken, loanController.getLoanById);
router.post('/', authenticateToken, upload.any(), loanController.createLoan);
router.put('/:id', authenticateToken, upload.any(), loanController.updateLoan);
router.delete('/:id', authenticateToken, authorizeManagement, loanController.deleteLoan);

// Workflow endpoints
router.post('/:id/add-principal', authenticateToken, loanController.addPrincipal);
router.post('/:id/renew', authenticateToken, loanController.renewLoan);
router.post('/:id/forfeit', authenticateToken, upload.fields([{ name: 'signature', maxCount: 1 }, { name: 'photo', maxCount: 1 }]), loanController.forfeitLoan);
router.post('/:id/undo-forfeit', authenticateToken, loanController.undoForfeit);
router.post('/:id/settle', authenticateToken, loanController.settleLoan);
router.get('/:id/history', authenticateToken, loanController.getLoanHistory);
router.post('/:id/restore', authenticateToken, authorizeManagement, loanController.restoreLoan);
router.delete('/:id/permanent-delete', authenticateToken, authorizeAdmin, loanController.permanentDeleteLoan);

module.exports = router;