require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Import routes
const loanRoutes = require('./routes/loans');
const customerRoutes = require('./routes/customers');
const transactionRoutes = require('./routes/transactions');

// Mount routes
app.use('/api/loans', loanRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/transactions', transactionRoutes);

app.listen(port, () => {
  console.log(`Pledge Loan V2.0 backend running on port ${port}`);
});