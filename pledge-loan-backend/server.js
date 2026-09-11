const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { PORT, ALLOWED_ORIGINS } = require('./src/config/constants');
const db = require('./src/config/db');

// Route imports
const authRoutes = require('./src/routes/auth.routes');
const customerRoutes = require('./src/routes/customer.routes');
const loanRoutes = require('./src/routes/loan.routes');
const transactionRoutes = require('./src/routes/transaction.routes');
const branchRoutes = require('./src/routes/branch.routes');
const dashboardRoutes = require('./src/routes/dashboard.routes');
const reportRoutes = require('./src/routes/report.routes');
const recycleBinRoutes = require('./src/routes/recycleBin.routes');
const settingsRoutes = require('./src/routes/settings.routes');
const searchRoutes = require('./src/routes/search.routes');

const app = express();

// CORS Configuration
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.indexOf(origin) === -1) {
      return callback(null, true);
    }
    return callback(null, true);
  }
}));

app.use(express.json());

// Base health check route
app.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT NOW()');
    res.status(200).json({
      message: "Welcome to Pledge Loan API",
      db_status: "Connected",
      db_time: rows[0].now
    });
  } catch (err) {
    console.error("Database connection error:", err);
    res.status(500).json({ 
      message: "DB Error", 
      error: err.message, 
      code: err.code 
    });
  }
});

// Mount Routes (preserving exact existing endpoint paths for web & mobile clients)
app.use('/api', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/recycle-bin', recycleBinRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/search', searchRoutes);

// Global 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: `Endpoint not found: ${req.method} ${req.originalUrl}` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error"
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = app;