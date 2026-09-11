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
    if (customer.id_proof_image_url) {
      customer.id_proof_image_url = bufferToDataUrl(customer.id_proof_image_url);
    }

    res.json(customer);
  } catch (err) {
    console.error("Get Customer Error:", err);
    res.status(500).json({ error: err.message });
  }
};

const createCustomer = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { 
      name, 
      phone_number, 
      secondary_phone_1, 
      secondary_phone_2, 
      address, 
      id_proof_type, 
      id_proof_number, 
      nominee_name, 
      nominee_relation 
    } = req.body;

    const photoBuffer = req.files && req.files['photo'] ? req.files['photo'][0].buffer : null;
    const idProofBuffer = req.files && req.files['idProofPhoto'] ? req.files['idProofPhoto'][0].buffer : null;

    if (!name || !phone_number) return res.status(400).json({ error: 'Name and Primary Phone number are required.' });

    let assignedBranch = req.user.branchId;
    if (req.user.role === 'admin' && req.body.branchId) {
      assignedBranch = parseInt(req.body.branchId, 10);
    }

    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || name.trim();
    const lastName = nameParts.slice(1).join(' ') || '-';

    await client.query('BEGIN');

    const newCustomerResult = await client.query(
      `INSERT INTO Customers (
        name, first_name, last_name, phone_number, address, 
        id_proof_type, id_proof_number, nominee_name, nominee_relation, 
        customer_image_url, id_proof_image_url, is_deleted, branch_id
       ) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false, $12) 
       RETURNING *`,
      [
        name, firstName, lastName, phone_number.trim(), address, 
        id_proof_type, id_proof_number, nominee_name, nominee_relation, 
        photoBuffer, idProofBuffer, assignedBranch || 1
      ]
    );
    const newCustomer = newCustomerResult.rows[0];

    await client.query(
      `INSERT INTO customer_phones (customer_id, phone_number, is_primary) VALUES ($1, $2, true)`,
      [newCustomer.id, phone_number.trim()]
    );

    if (secondary_phone_1 && secondary_phone_1.trim()) {
      await client.query(
        `INSERT INTO customer_phones (customer_id, phone_number, is_primary) VALUES ($1, $2, false)`,
        [newCustomer.id, secondary_phone_1.trim()]
      );
    }
    if (secondary_phone_2 && secondary_phone_2.trim()) {
      await client.query(
        `INSERT INTO customer_phones (customer_id, phone_number, is_primary) VALUES ($1, $2, false)`,
        [newCustomer.id, secondary_phone_2.trim()]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(newCustomer);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("❌ Create Customer Error:", err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
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
    let photoBuffer = null;
    let idProofBuffer = null;

    if (req.files && req.files['photo']) {
      photoBuffer = req.files['photo'][0].buffer;
    }
    if (req.files && req.files['idProofPhoto']) {
      idProofBuffer = req.files['idProofPhoto'][0].buffer;
    }

    let query = `
      UPDATE Customers 
      SET name = $1, phone_number = $2, address = $3, id_proof_type = $4, 
          id_proof_number = $5, nominee_name = $6, nominee_relation = $7
    `;
    const params = [name, phone_number, address, id_proof_type, id_proof_number, nominee_name, nominee_relation];

    if (photoBuffer) {
      query += `, customer_image_url = $${params.length + 1}`;
      params.push(photoBuffer);
    }
    if (idProofBuffer) {
      query += `, id_proof_image_url = $${params.length + 1}`;
      params.push(idProofBuffer);
    }

    query += ` WHERE id = $${params.length + 1} RETURNING *`;
    params.push(id);

    const updateCustomerResult = await db.query(query, params);
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

// GROUP BY Loan so multi-item loans appear as 1 unified entry on customer profile
const getCustomerLoans = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const cust = await db.query("SELECT branch_id FROM Customers WHERE id = $1", [id]);
    if (cust.rows.length > 0 && req.user.role !== 'admin' && cust.rows[0].branch_id && cust.rows[0].branch_id !== req.user.branchId) {
      return res.status(403).json({ error: "Access Denied." });
    }

    const query = `
      SELECT 
        l.id AS loan_id, 
        l.book_loan_number, 
        l.principal_amount, 
        l.pledge_date as pledge_date, 
        COALESCE(l.due_date, l.pledge_date + INTERVAL '1 year') as due_date, 
        l.status,
        COUNT(pi.id)::int AS items_count,
        COALESCE(STRING_AGG(pi.description, ', '), 'Pledged Articles') AS description,
        COALESCE(SUM(CASE WHEN LOWER(pi.item_type) LIKE '%gold%' THEN pi.net_weight ELSE 0 END), 0) AS gold_net_weight,
        COALESCE(SUM(CASE WHEN LOWER(pi.item_type) LIKE '%silver%' THEN pi.net_weight ELSE 0 END), 0) AS silver_net_weight
      FROM Loans l 
      LEFT JOIN PledgedItems pi ON l.id = pi.loan_id 
      WHERE l.customer_id = $1 AND LOWER(l.status) != 'deleted' 
      GROUP BY l.id, l.book_loan_number, l.principal_amount, l.pledge_date, l.due_date, l.status
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