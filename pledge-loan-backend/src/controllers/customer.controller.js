const db = require('../config/db');
const { getTargetBranchId } = require('../middleware/auth.middleware');
const { bufferToDataUrl } = require('../utils/image.utils');

const listCustomers = async (req, res) => {
  try {
    const targetBranch = getTargetBranchId(req);
    if (targetBranch) {
      await db.query("UPDATE Loans SET status = 'overdue' WHERE due_date < NOW() AND LOWER(status) = 'active' AND branch_id = $1", [targetBranch]).catch(() => {});
    } else {
      await db.query("UPDATE Loans SET status = 'overdue' WHERE due_date < NOW() AND LOWER(status) = 'active'").catch(() => {});
    }

    let query = `
      SELECT c.id, c.name, c.phone_number, c.address, c.customer_image_url, c.branch_id, b.branch_name, 
        COUNT(CASE WHEN LOWER(l.status) = 'active' THEN 1 END)::int AS active_loan_count, 
        COUNT(CASE WHEN LOWER(l.status) = 'overdue' THEN 1 END)::int AS overdue_loan_count, 
        COUNT(CASE WHEN LOWER(l.status) = 'paid' THEN 1 END)::int AS paid_loan_count 
      FROM Customers c 
      LEFT JOIN Loans l ON c.id = l.customer_id AND LOWER(l.status) != 'deleted' 
      LEFT JOIN Branches b ON c.branch_id = b.id 
      WHERE COALESCE(c.is_deleted, false) = false
    `;
    const params = [];
    if (targetBranch) {
      query += ` AND (c.branch_id = $1 OR c.branch_id IS NULL)`;
      params.push(targetBranch);
    }
    query += ` GROUP BY c.id, b.branch_name ORDER BY c.name ASC`;

    const result = await db.query(query, params);
    const customers = result.rows.map(c => {
      if (c.customer_image_url) {
        c.customer_image_url = bufferToDataUrl(c.customer_image_url);
      }
      return c;
    });

    res.json(customers);
  } catch (err) {
    console.error("List Customers Error:", err);
    res.status(500).json({ error: err.message });
  }
};

const getCustomerById = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const query = `
      SELECT c.*, b.branch_name 
      FROM Customers c 
      LEFT JOIN Branches b ON c.branch_id = b.id 
      WHERE c.id = $1 AND COALESCE(c.is_deleted, false) = false
    `;
    const customerResult = await db.query(query, [id]);
    if (customerResult.rows.length === 0) return res.status(404).json({ error: "Not found." });

    const customer = customerResult.rows[0];
    const userRole = req.user.role;
    const userBranchId = parseInt(req.user.branchId || 0, 10);
    const customerBranchId = parseInt(customer.branch_id || 0, 10);

    if (userRole !== 'admin' && customerBranchId !== 0 && customerBranchId !== userBranchId) {
      return res.status(403).json({ error: "Access Denied." });
    }

    if (customer.customer_image_url) {
      customer.customer_image_url = bufferToDataUrl(customer.customer_image_url);
    }

    res.json(customer);
  } catch (err) {
    console.error("Get Customer Error:", err);
    res.status(500).json({ error: err.message });
  }
};

const createCustomer = async (req, res) => {
  try {
    const { name, phone_number, address, id_proof_type, id_proof_number, nominee_name, nominee_relation } = req.body;
    const imageBuffer = req.file ? req.file.buffer : null;

    if (!name || !phone_number) return res.status(400).json({ error: 'Name and Phone number are required.' });

    let assignedBranch = req.user.branchId;
    if (req.user.role === 'admin' && req.body.branchId) {
      assignedBranch = parseInt(req.body.branchId, 10);
    }

    // Split name into first_name and last_name for legacy column compatibility
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || name.trim();
    const lastName = nameParts.slice(1).join(' ') || '-';

    const newCustomerResult = await db.query(
      `INSERT INTO Customers (name, first_name, last_name, phone_number, address, id_proof_type, id_proof_number, nominee_name, nominee_relation, customer_image_url, is_deleted, branch_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false, $11) RETURNING *`,
      [name, firstName, lastName, phone_number, address, id_proof_type, id_proof_number, nominee_name, nominee_relation, imageBuffer, assignedBranch || 1]
    );

    res.status(201).json(newCustomerResult.rows[0]);
  } catch (err) {
    console.error("❌ Create Customer Error:", err);
    res.status(500).json({ error: err.message });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const checkBranch = await db.query("SELECT branch_id FROM Customers WHERE id = $1", [id]);
    if (checkBranch.rows.length === 0) return res.status(404).json({ error: "Not found." });

    if (req.user.role !== 'admin' && checkBranch.rows[0].branch_id && checkBranch.rows[0].branch_id !== req.user.branchId) {
      return res.status(403).json({ error: "Access Denied." });
    }

    const { name, phone_number, address, id_proof_type, id_proof_number, nominee_name, nominee_relation } = req.body;
    let imageBuffer = null;
    let updateImage = false;

    if (req.file) {
      imageBuffer = req.file.buffer;
      updateImage = true;
    } else if (req.body.removeCurrentImage === 'true') {
      imageBuffer = null;
      updateImage = true;
    }

    let query, values;
    if (updateImage) {
      query = `UPDATE Customers SET name = $1, phone_number = $2, address = $3, id_proof_type = $4, id_proof_number = $5, nominee_name = $6, nominee_relation = $7, customer_image_url = $8 WHERE id = $9 RETURNING *`;
      values = [name, phone_number, address, id_proof_type, id_proof_number, nominee_name, nominee_relation, imageBuffer, id];
    } else {
      query = `UPDATE Customers SET name = $1, phone_number = $2, address = $3, id_proof_type = $4, id_proof_number = $5, nominee_name = $6, nominee_relation = $7 WHERE id = $8 RETURNING *`;
      values = [name, phone_number, address, id_proof_type, id_proof_number, nominee_name, nominee_relation, id];
    }

    const updateCustomerResult = await db.query(query, values);
    res.json(updateCustomerResult.rows[0]);
  } catch (err) {
    console.error("Update Customer Error:", err);
    res.status(500).json({ error: err.message });
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const cust = await db.query("SELECT branch_id FROM Customers WHERE id = $1", [id]);
    if (cust.rows.length === 0) return res.status(404).json({ error: "Not found." });

    if (req.user.role !== 'admin' && cust.rows[0].branch_id && cust.rows[0].branch_id !== req.user.branchId) {
      return res.status(403).json({ error: "Access Denied." });
    }

    const activeLoanCheck = await db.query("SELECT COUNT(*) FROM Loans WHERE customer_id = $1 AND LOWER(status) IN ('active', 'overdue')", [id]);
    if (parseInt(activeLoanCheck.rows[0].count, 10) > 0) {
      return res.status(400).json({ error: "Active loans exist." });
    }

    await db.query("UPDATE Customers SET is_deleted = true WHERE id = $1 RETURNING id, name", [id]);
    await db.query("UPDATE Loans SET status = 'deleted' WHERE customer_id = $1 AND LOWER(status) IN ('paid', 'forfeited')", [id]);
    res.json({ message: `Customer deleted.` });
  } catch (err) {
    console.error("Delete Customer Error:", err);
    res.status(500).json({ error: err.message });
  }
};

const getCustomerLoans = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const cust = await db.query("SELECT branch_id FROM Customers WHERE id = $1", [id]);
    if (cust.rows.length > 0 && req.user.role !== 'admin' && cust.rows[0].branch_id && cust.rows[0].branch_id !== req.user.branchId) {
      return res.status(403).json({ error: "Access Denied." });
    }

    const query = `
      SELECT l.id AS loan_id, l.book_loan_number, l.principal_amount, 
             COALESCE(l.pledge_date, l.loan_date) as pledge_date, 
             COALESCE(l.due_date, l.pledge_date + INTERVAL '1 year', l.loan_date + INTERVAL '1 year') as due_date, 
             l.status, pi.description 
      FROM Loans l 
      LEFT JOIN PledgedItems pi ON l.id = pi.loan_id 
      WHERE l.customer_id = $1 AND LOWER(l.status) != 'deleted' 
      ORDER BY l.id DESC
    `;
    const customerLoans = await db.query(query, [id]);
    res.json(customerLoans.rows);
  } catch (err) {
    console.error("Customer Loans Error:", err);
    res.status(500).json({ error: err.message });
  }
};

const restoreCustomer = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await db.query("UPDATE Customers SET is_deleted=false WHERE id=$1", [id]);
    await db.query("UPDATE Loans SET status='paid' WHERE customer_id=$1 AND LOWER(status)='deleted'", [id]);
    res.json({ message: "Restored." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const permanentDeleteCustomer = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const lR = await client.query("SELECT id FROM Loans WHERE customer_id=$1", [id]);
    const lIds = lR.rows.map(r => r.id);

    if (lIds.length > 0) {
      const s = lIds.join(',');
      await client.query(`DELETE FROM PledgedItems WHERE loan_id IN (${s})`);
      await client.query(`DELETE FROM Transactions WHERE loan_id IN (${s})`);
      await client.query(`DELETE FROM loan_history WHERE loan_id IN (${s})`);
      await client.query(`DELETE FROM Loans WHERE customer_id=$1`, [id]);
    }

    await client.query("DELETE FROM Customers WHERE id=$1", [id]);
    await client.query('COMMIT');
    res.json({ message: "Deleted." });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

module.exports = {
  listCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerLoans,
  restoreCustomer,
  permanentDeleteCustomer
};