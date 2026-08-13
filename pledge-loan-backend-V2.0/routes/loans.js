const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { calculateLoanSummary } = require('../services/calculationService');
const { generateBarcode } = require('../utils/barcodeGenerator');

// GET: Retrieve Loan Details & Apply Calculation Engine
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Fetch loan, items, and transactions concurrently
    const [loanRes, itemsRes, transRes] = await Promise.all([
      pool.query('SELECT * FROM loans WHERE id = $1', [id]),
      pool.query('SELECT * FROM pledged_items WHERE loan_id = $1', [id]),
      pool.query('SELECT * FROM transactions WHERE loan_id = $1', [id])
    ]);

    if (loanRes.rows.length === 0) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    const loan = loanRes.rows[0];
    const items = itemsRes.rows;
    const transactions = transRes.rows;

    // Process the live financial summary and weight balances
    const summary = calculateLoanSummary(loan.principal_amount, loan.interest_rate, loan.loan_date, items);

    res.json({
      loan,
      summary,
      pledged_items: items,
      transactions: transactions
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error retrieving loan details' });
  }
});

// POST: Create a new loan and auto-generate item barcodes
router.post('/', async (req, res) => {
  const { customer_id, principal_amount, interest_rate, loan_date, items } = req.body;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Insert the main loan record
    const loanResult = await client.query(
      `INSERT INTO loans (customer_id, principal_amount, interest_rate, loan_date, status)
       VALUES ($1, $2, $3, $4, 'ACTIVE') RETURNING id`,
      [customer_id, principal_amount, interest_rate, loan_date || new Date()]
    );
    const loanId = loanResult.rows[0].id;

    // 2. Insert pledged items with auto-generated barcodes
    if (items && items.length > 0) {
      for (const item of items) {
        // Generate live barcode instead of requiring manual input
        const generatedBarcode = generateBarcode(item.item_name, item.metal_type);
        
        await client.query(
          `INSERT INTO pledged_items (loan_id, barcode, metal_type, item_name, gross_weight_grams, net_weight_grams) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [loanId, generatedBarcode, item.metal_type, item.item_name, item.gross_weight_grams, item.net_weight_grams]
        );
      }
    }
    
    await client.query('COMMIT');
    res.status(201).json({ loan_id: loanId, message: 'Loan and pledged items successfully registered' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to create loan' });
  } finally {
    client.release();
  }
});

module.exports = router;