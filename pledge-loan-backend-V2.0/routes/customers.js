const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET: Retrieve all active customers with their phone numbers
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT c.*, 
             COALESCE(array_agg(cp.phone_number) FILTER (WHERE cp.phone_number IS NOT NULL), '{}') as phones 
      FROM customers c
      LEFT JOIN customer_phones cp ON c.id = cp.customer_id
      WHERE c.is_deleted = false
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error retrieving customers' });
  }
});

// POST: Create a new customer and link phone numbers
router.post('/', async (req, res) => {
  const { first_name, last_name, address_line_1, address_line_2, city, phones } = req.body;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Insert the customer profile
    const custQuery = `
      INSERT INTO customers (first_name, last_name, address_line_1, address_line_2, city)
      VALUES ($1, $2, $3, $4, $5) RETURNING id
    `;
    const custResult = await client.query(custQuery, [first_name, last_name, address_line_1, address_line_2, city]);
    const customerId = custResult.rows[0].id;

    // 2. Insert associated phone numbers
    if (phones && Array.isArray(phones) && phones.length > 0) {
      for (const phone of phones) {
        await client.query(
          'INSERT INTO customer_phones (customer_id, phone_number, is_primary) VALUES ($1, $2, $3)',
          [customerId, phone.number, phone.is_primary || false]
        );
      }
    }
    
    await client.query('COMMIT');
    res.status(201).json({ id: customerId, message: 'Customer profile successfully created' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to create customer profile' });
  } finally {
    client.release();
  }
});

module.exports = router;