const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// POST: Log a new payment transaction
router.post('/', async (req, res) => {
  const { loan_id, amount_paid, payment_type, changed_by_username, branch_id } = req.body;
  
  try {
    const query = `
      INSERT INTO transactions (loan_id, amount_paid, payment_type, changed_by_username, branch_id)
      VALUES ($1, $2, $3, $4, $5) RETURNING id, payment_date
    `;
    
    const { rows } = await pool.query(query, [loan_id, amount_paid, payment_type, changed_by_username, branch_id]);
    res.status(201).json({ 
      transaction_id: rows[0].id, 
      payment_date: rows[0].payment_date,
      message: 'Transaction logged successfully' 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error processing transaction' });
  }
});

// GET: Retrieve transaction history for a specific loan
router.get('/loan/:loan_id', async (req, res) => {
  try {
    const { loan_id } = req.params;
    const query = `
      SELECT * FROM transactions 
      WHERE loan_id = $1 
      ORDER BY payment_date DESC
    `;
    const { rows } = await pool.query(query, [loan_id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error retrieving transactions' });
  }
});

module.exports = router;