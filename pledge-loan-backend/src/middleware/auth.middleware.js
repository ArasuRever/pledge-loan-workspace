const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/constants');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  // Strips "Bearer " cleanly to guarantee a pure string
  const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : null;

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error("JWT Verification Failed:", err.message);
      return res.status(403).json({ error: "Forbidden", reason: err.message });
    }
    req.user = user;
    next();
  });
};

const authorizeAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  next();
};

const authorizeManagement = (req, res, next) => {
  if (['admin', 'manager'].includes(req.user.role)) {
    next();
  } else {
    return res.sendStatus(403);
  }
};

const getTargetBranchId = (req) => {
  const { role, branchId: userBranchId } = req.user;
  const { branchId: queryBranchId } = req.query;
  if (role === 'admin') {
    if (queryBranchId && queryBranchId !== 'all') return parseInt(queryBranchId, 10);
    return null;
  } else {
    return userBranchId;
  }
};

module.exports = {
  authenticateToken,
  authorizeAdmin,
  authorizeManagement,
  getTargetBranchId
};