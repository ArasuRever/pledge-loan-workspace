const db = require('../config/db');
const { getTargetBranchId } = require('../middleware/auth.middleware');
const { getScopedLoanQuery, calculateLoanFinancials } = require('../utils/calculation.engine');
const { bufferToDataUrl } = require('../utils/image.utils');

const listLoans = async (req, res) => {
  try {
    const targetBranch = getTargetBranchId(req);
    if (targetBranch) {
      await db.query("UPDATE Loans SET status = 'overdue' WHERE due_date < NOW() AND status = 'active' AND branch_id = $1", [targetBranch]);
    } else {
      await db.query("UPDATE Loans SET status = 'overdue' WHERE due_date < NOW() AND status = 'active'");
    }

    let query = `
      SELECT l.id, l.book_loan_number, l.principal_amount, l.pledge_date, l.due_date, l.status, 
             c.name AS customer_name, c.phone_number, b.branch_name 
      FROM Loans l 
      JOIN Customers c ON l.customer_id = c.id 
      LEFT JOIN Branches b ON l.branch_id = b.id 
      WHERE l.status IN ('active', 'overdue', 'paid', 'forfeited') AND c.is_deleted = false
    `;
    const params = [];
    if (targetBranch) {
      query += ` AND l.branch_id = $1`;
      params.push(targetBranch);
    }
    query += ` ORDER BY l.pledge_date DESC`;

    const allLoans = await db.query(query, params);
    res.json(allLoans.rows);
  } catch (err) {
    res.status(500).send("Error");
  }
};

const getRecentCreated = async (req, res) => {
  try {
    let base = `
      SELECT l.id, l.principal_amount, c.name AS customer_name 
      FROM Loans l 
      LEFT JOIN Customers c ON l.customer_id = c.id 
      WHERE l.status != 'deleted' AND c.is_deleted = false
    `;
    const { q, params } = getScopedLoanQuery(base, req);
    const finalQ = q + ` ORDER BY l.created_at DESC LIMIT 5`;
    const result = await db.query(finalQ, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).send("Server Error");
  }
};

const getRecentClosed = async (req, res) => {
  try {
    let base = `
      SELECT l.id, l.principal_amount, c.name AS customer_name 
      FROM Loans l 
      LEFT JOIN Customers c ON l.customer_id = c.id 
      WHERE l.status = 'paid' AND c.is_deleted = false
    `;
    const { q, params } = getScopedLoanQuery(base, req);
    const finalQ = q + ` ORDER BY l.created_at DESC LIMIT 5`;
    const result = await db.query(finalQ, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).send("Server Error");
  }
};

const getOverdueLoans = async (req, res) => {
  try {
    const targetBranch = getTargetBranchId(req);
    if (targetBranch) {
      await db.query("UPDATE Loans SET status = 'overdue' WHERE due_date < NOW() AND status = 'active' AND branch_id = $1", [targetBranch]);
    } else {
      await db.query("UPDATE Loans SET status = 'overdue' WHERE due_date < NOW() AND status = 'active'");
    }

    let base = `
      SELECT l.id, l.due_date, l.principal_amount, l.book_loan_number, l.pledge_date, 
             c.name AS customer_name, c.phone_number, c.address 
      FROM Loans l 
      JOIN Customers c ON l.customer_id = c.id 
      WHERE l.status = 'overdue' AND c.is_deleted = false
    `;
    const { q, params } = getScopedLoanQuery(base, req);
    const finalQ = q + ` ORDER BY l.due_date ASC`;
    const overdueLoans = await db.query(finalQ, params);
    res.json(overdueLoans.rows);
  } catch (err) {
    res.status(500).send("Server Error");
  }
};

const findByBookNumber = async (req, res) => {
  try {
    const { bookNumber } = req.params;
    const targetBranch = getTargetBranchId(req);
    let query = "SELECT id FROM Loans WHERE book_loan_number = $1 AND status != 'deleted'";
    let params = [bookNumber];
    if (targetBranch) {
      query += " AND branch_id = $2";
      params.push(targetBranch);
    }
    const result = await db.query(query, params);
    if (result.rows.length === 0) return res.status(404).json({ error: "No loan found." });
    res.json({ loanId: result.rows[0].id });
  } catch (err) {
    res.status(500).send("Server Error");
  }
};

const getLoanById = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    const query = `
      SELECT 
        l.id, l.customer_id, l.principal_amount, l.interest_rate, l.book_loan_number, 
        l.status, l.branch_id, l.appraised_value, l.created_at, l.closed_date,
        l.sale_price, 
        TO_CHAR(l.pledge_date, 'YYYY-MM-DD') as pledge_date, 
        TO_CHAR(l.due_date, 'YYYY-MM-DD') as due_date,
        pi.item_type, pi.description, pi.quality, pi.weight, 
        pi.gross_weight, pi.net_weight, pi.purity, pi.item_image_data, 
        c.name AS customer_name, c.phone_number, c.address, c.customer_image_url 
      FROM Loans l 
      LEFT JOIN PledgedItems pi ON l.id = pi.loan_id 
      JOIN Customers c ON l.customer_id = c.id 
      WHERE l.id = $1
    `;

    const loanResult = await db.query(query, [id]);
    if (loanResult.rows.length === 0) return res.status(404).json({ error: "Not found." });
    let loanDetails = loanResult.rows[0];

    if (req.user.role !== 'admin' && loanDetails.branch_id !== req.user.branchId) {
      return res.status(403).json({ error: "Access Denied." });
    }

    const transactionsResult = await db.query(
      "SELECT * FROM Transactions WHERE loan_id = $1 ORDER BY payment_date ASC",
      [id]
    );

    const financials = calculateLoanFinancials(loanDetails, transactionsResult.rows);

    if (loanDetails.item_image_data) {
      loanDetails.item_image_data_url = bufferToDataUrl(loanDetails.item_image_data);
    }
    delete loanDetails.item_image_data;

    if (loanDetails.customer_image_url) {
      loanDetails.customer_image_url = bufferToDataUrl(loanDetails.customer_image_url);
    }

    res.json({
      loanDetails: loanDetails,
      transactions: transactionsResult.rows.sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date)),
      interestBreakdown: financials.breakdown,
      calculated: financials
    });
  } catch (err) {
    res.status(500).send("Error");
  }
};

const createLoan = async (req, res) => {
  const client = await db.pool.connect();
  const username = req.user.username;
  try {
    const {
      customer_id,
      principal_amount,
      interest_rate,
      book_loan_number,
      item_type,
      description,
      quality,
      gross_weight,
      net_weight,
      purity,
      appraised_value,
      deductFirstMonthInterest
    } = req.body;

    const itemImageBuffer = req.file ? req.file.buffer : null;
    const principal = parseFloat(principal_amount);
    const rate = parseFloat(interest_rate);

    if (!customer_id || isNaN(principal) || principal <= 0 || isNaN(rate) || rate <= 0 || !book_loan_number || !item_type || !description) {
      return res.status(400).send("Missing fields.");
    }

    const customerCheck = await client.query("SELECT branch_id, is_deleted FROM Customers WHERE id = $1", [customer_id]);
    if (customerCheck.rows.length === 0 || customerCheck.rows[0].is_deleted) {
      return res.status(404).send("Customer not found.");
    }
    const custBranch = customerCheck.rows[0].branch_id;
    if (req.user.role !== 'admin' && custBranch !== req.user.branchId) {
      return res.status(403).json({ error: "Access Denied." });
    }

    await client.query('BEGIN');
    const loanQuery = `
      INSERT INTO Loans (customer_id, principal_amount, interest_rate, book_loan_number, appraised_value, branch_id) 
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
    `;
    const loanResult = await client.query(loanQuery, [customer_id, principal, rate, book_loan_number, appraised_value || 0, custBranch]);
    const newLoanId = loanResult.rows[0].id;

    const finalGrossWeight = gross_weight || req.body.weight;
    const itemQuery = `
      INSERT INTO PledgedItems (loan_id, item_type, description, quality, weight, gross_weight, net_weight, purity, item_image_data) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;
    await client.query(itemQuery, [newLoanId, item_type, description, quality, finalGrossWeight, finalGrossWeight, net_weight, purity, itemImageBuffer]);

    if (deductFirstMonthInterest === 'true') {
      const firstMonthInterest = principal * (rate / 100);
      if (firstMonthInterest > 0) {
        await client.query(
          "INSERT INTO Transactions (loan_id, amount_paid, payment_type, payment_date, changed_by_username) VALUES ($1, $2, 'interest', NOW(), $3)",
          [newLoanId, firstMonthInterest, username]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ message: "Loan created", loanId: newLoanId });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(400).json({ error: "Book Loan Number already exists." });
    res.status(500).send("Error");
  } finally {
    client.release();
  }
};

const updateLoan = async (req, res) => {
  const { id } = req.params;
  const loanId = parseInt(id, 10);
  const username = req.user.username;
  const {
    book_loan_number,
    interest_rate,
    pledge_date,
    due_date,
    appraised_value,
    item_type,
    description,
    quality,
    gross_weight,
    net_weight,
    purity
  } = req.body;

  const newItemImageBuffer = req.file ? req.file.buffer : undefined;
  const removeItemImage = req.body.removeItemImage === 'true';

  if (isNaN(loanId) || loanId <= 0) return res.status(400).json({ error: "Invalid ID." });

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const currentDataQuery = `
      SELECT l.*, pi.id AS item_id, pi.* 
      FROM "loans" l 
      LEFT JOIN "pledgeditems" pi ON l.id = pi.loan_id 
      WHERE l.id = $1 FOR UPDATE OF l
    `;
    const currentResult = await client.query(currentDataQuery, [loanId]);
    if (currentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "Not found." });
    }

    const oldData = currentResult.rows[0];
    if (req.user.role !== 'admin' && oldData.branch_id !== req.user.branchId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: "Access Denied." });
    }

    const itemId = oldData.item_id;
    const historyLogs = [];
    const loanUpdateFields = [];
    const loanUpdateValues = [];
    const itemUpdateFields = [];
    const itemUpdateValues = [];

    const addUpdate = (table, field, newValue, oldValue, fieldsArray, valuesArray, logLabel = field) => {
      if (newValue === undefined) return;
      let dbValue = newValue === "" ? null : newValue;
      let oldValCompare = oldValue;
      let newValCompare = dbValue;

      if (['pledge_date', 'due_date'].includes(field)) {
        if (oldValue) {
          const d = new Date(oldValue);
          oldValCompare = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        } else {
          oldValCompare = null;
        }
        newValCompare = dbValue;
      } else if (typeof oldValue === 'number' || !isNaN(parseFloat(oldValue))) {
        if (oldValue !== null) oldValCompare = parseFloat(oldValue);
        if (dbValue !== null) newValCompare = parseFloat(dbValue);
      }

      if (newValCompare !== oldValCompare) {
        fieldsArray.push(`"${field}"`);
        valuesArray.push(dbValue);
        historyLogs.push({
          loan_id: loanId,
          field_changed: logLabel,
          old_value: String(oldValue ?? 'null'),
          new_value: String(dbValue ?? 'null'),
          changed_by_username: username
        });
      }
    };

    addUpdate('loans', 'book_loan_number', book_loan_number, oldData.book_loan_number, loanUpdateFields, loanUpdateValues);
    addUpdate('loans', 'interest_rate', interest_rate, oldData.interest_rate, loanUpdateFields, loanUpdateValues);
    addUpdate('loans', 'pledge_date', pledge_date, oldData.pledge_date, loanUpdateFields, loanUpdateValues);
    addUpdate('loans', 'due_date', due_date, oldData.due_date, loanUpdateFields, loanUpdateValues);
    addUpdate('loans', 'appraised_value', appraised_value, oldData.appraised_value, loanUpdateFields, loanUpdateValues);

    if (itemId) {
      addUpdate('pledgeditems', 'item_type', item_type, oldData.item_type, itemUpdateFields, itemUpdateValues);
      addUpdate('pledgeditems', 'description', description, oldData.description, itemUpdateFields, itemUpdateValues);
      addUpdate('pledgeditems', 'quality', quality, oldData.quality, itemUpdateFields, itemUpdateValues);
      addUpdate('pledgeditems', 'weight', gross_weight, oldData.weight, itemUpdateFields, itemUpdateValues, 'gross_weight (legacy)');
      addUpdate('pledgeditems', 'gross_weight', gross_weight, oldData.gross_weight, itemUpdateFields, itemUpdateValues);
      addUpdate('pledgeditems', 'net_weight', net_weight, oldData.net_weight, itemUpdateFields, itemUpdateValues);
      addUpdate('pledgeditems', 'purity', purity, oldData.purity, itemUpdateFields, itemUpdateValues);

      if (newItemImageBuffer !== undefined || removeItemImage) {
        const finalImageValue = removeItemImage ? null : newItemImageBuffer;
        itemUpdateFields.push(`"item_image_data"`);
        itemUpdateValues.push(finalImageValue);
        historyLogs.push({
          loan_id: loanId,
          field_changed: 'item_image',
          old_value: oldData.item_image_data ? '[Image]' : '[None]',
          new_value: finalImageValue ? '[New]' : '[Removed]',
          changed_by_username: username
        });
      }
    }

    if (loanUpdateFields.length > 0) {
      const setClause = loanUpdateFields.map((f, i) => `${f}=$${i + 1}`).join(', ');
      loanUpdateValues.push(loanId);
      await client.query(`UPDATE "loans" SET ${setClause} WHERE id=$${loanUpdateValues.length}`, loanUpdateValues);
    }

    if (itemUpdateFields.length > 0 && itemId) {
      const setClause = itemUpdateFields.map((f, i) => `${f}=$${i + 1}`).join(', ');
      itemUpdateValues.push(itemId);
      await client.query(`UPDATE "pledgeditems" SET ${setClause} WHERE id=$${itemUpdateValues.length}`, itemUpdateValues);
    }

    if (historyLogs.length > 0) {
      const q = `INSERT INTO loan_history (loan_id, field_changed, old_value, new_value, changed_by_username) VALUES ($1, $2, $3, $4, $5)`;
      for (const log of historyLogs) {
        await client.query(q, [log.loan_id, log.field_changed, log.old_value, log.new_value, log.changed_by_username]);
      }
    }

    await client.query('COMMIT');
    res.json({ message: `Updated.` });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).send("Error");
  } finally {
    client.release();
  }
};

const addPrincipal = async (req, res) => {
  const { id } = req.params;
  const { additionalAmount } = req.body;
  const loanId = parseInt(id, 10);
  const amountToAdd = parseFloat(additionalAmount);
  const username = req.user.username;

  if (isNaN(loanId) || loanId <= 0) return res.status(400).json({ error: "Invalid ID." });
  if (isNaN(amountToAdd) || amountToAdd <= 0) return res.status(400).json({ error: "Invalid amount." });

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const loanResult = await client.query("SELECT principal_amount, status, branch_id FROM Loans WHERE id = $1 FOR UPDATE", [loanId]);
    if (loanResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "Not found." });
    }

    const currentLoan = loanResult.rows[0];
    if (req.user.role !== 'admin' && currentLoan.branch_id !== req.user.branchId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: "Access Denied." });
    }

    if (currentLoan.status !== 'active' && currentLoan.status !== 'overdue') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Cannot add principal.` });
    }

    const currentPrincipal = parseFloat(currentLoan.principal_amount);
    const newPrincipal = currentPrincipal + amountToAdd;
    const updateResult = await client.query("UPDATE Loans SET principal_amount = $1 WHERE id = $2 RETURNING *", [newPrincipal, loanId]);
    await client.query(
      "INSERT INTO Transactions (loan_id, amount_paid, payment_type, payment_date, changed_by_username) VALUES ($1, $2, $3, NOW(), $4)",
      [loanId, amountToAdd, 'disbursement', username]
    );

    await client.query('COMMIT');
    res.json({ message: `Added ₹${amountToAdd.toFixed(2)}.`, loan: updateResult.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).send("Error.");
  } finally {
    client.release();
  }
};

const renewLoan = async (req, res) => {
  const client = await db.pool.connect();
  const username = req.user.username;
  try {
    const oldLoanId = parseInt(req.params.id, 10);
    const { newBookLoanNumber, interestPaid, principalPaid, newInterestRate, newPrincipal, deductFirstMonthInterest } = req.body;

    const intPaid = parseFloat(interestPaid) || 0;
    const prinPaid = parseFloat(principalPaid) || 0;
    const finalNewPrincipal = parseFloat(newPrincipal);
    const newRate = parseFloat(newInterestRate);

    if (!newBookLoanNumber || isNaN(finalNewPrincipal) || isNaN(newRate)) {
      return res.status(400).json({ error: "Invalid renewal data." });
    }

    await client.query('BEGIN');

    const oldLoanRes = await client.query("SELECT * FROM Loans WHERE id = $1 FOR UPDATE", [oldLoanId]);
    if (oldLoanRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "Loan not found" });
    }
    const oldLoan = oldLoanRes.rows[0];

    if (req.user.role !== 'admin' && oldLoan.branch_id !== req.user.branchId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: "Access Denied" });
    }
    if (oldLoan.status !== 'active' && oldLoan.status !== 'overdue') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: "Loan must be active/overdue to renew." });
    }

    if (intPaid > 0) {
      await client.query("INSERT INTO Transactions (loan_id, amount_paid, payment_type, payment_date, changed_by_username) VALUES ($1, $2, 'interest', NOW(), $3)", [oldLoanId, intPaid, username]);
    }
    if (prinPaid > 0) {
      await client.query("INSERT INTO Transactions (loan_id, amount_paid, payment_type, payment_date, changed_by_username) VALUES ($1, $2, 'principal', NOW(), $3)", [oldLoanId, prinPaid, username]);
      const reducedPrincipal = parseFloat(oldLoan.principal_amount) - prinPaid;
      await client.query("UPDATE Loans SET principal_amount = $1 WHERE id = $2", [reducedPrincipal, oldLoanId]);
    }

    await client.query("UPDATE Loans SET status = 'paid', closed_date = NOW() WHERE id = $1", [oldLoanId]);
    await client.query("INSERT INTO loan_history (loan_id, field_changed, old_value, new_value, changed_by_username) VALUES ($1, 'status', 'renewed', $2, $3)", [oldLoanId, `Renewed to ${newBookLoanNumber}`, username]);

    const newLoanRes = await client.query(
      `INSERT INTO Loans (customer_id, principal_amount, interest_rate, book_loan_number, pledge_date, due_date, status, branch_id, appraised_value) 
       VALUES ($1, $2, $3, $4, NOW(), NOW() + INTERVAL '1 year', 'active', $5, $6) RETURNING id`,
      [oldLoan.customer_id, finalNewPrincipal, newRate, newBookLoanNumber, oldLoan.branch_id, oldLoan.appraised_value]
    );
    const newLoanId = newLoanRes.rows[0].id;

    const itemRes = await client.query("SELECT * FROM PledgedItems WHERE loan_id = $1", [oldLoanId]);
    if (itemRes.rows.length > 0) {
      const item = itemRes.rows[0];
      await client.query(
        `INSERT INTO PledgedItems (loan_id, item_type, description, quality, weight, gross_weight, net_weight, purity, item_image_data) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [newLoanId, item.item_type, item.description, item.quality, item.weight, item.gross_weight, item.net_weight, item.purity, item.item_image_data]
      );
    }

    if (deductFirstMonthInterest === true || deductFirstMonthInterest === 'true') {
      const firstMonthInt = finalNewPrincipal * (newRate / 100);
      if (firstMonthInt > 0) {
        await client.query(
          "INSERT INTO Transactions (loan_id, amount_paid, payment_type, payment_date, changed_by_username) VALUES ($1, $2, 'interest', NOW(), $3)",
          [newLoanId, firstMonthInt, username]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ message: "Loan Renewed Successfully!", newLoanId: newLoanId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    if (err.code === '23505') return res.status(400).json({ error: "New Book Loan Number already exists." });
    res.status(500).json({ error: "Renewal failed." });
  } finally {
    client.release();
  }
};

const forfeitLoan = async (req, res) => {
  const client = await db.pool.connect();
  const username = req.user.username;
  try {
    const loanId = parseInt(req.params.id, 10);
    const { salePrice } = req.body;
    const finalSalePrice = parseFloat(salePrice) || 0;

    const signatureBuffer = (req.files && req.files['signature']) ? req.files['signature'][0].buffer : null;
    const photoBuffer = (req.files && req.files['photo']) ? req.files['photo'][0].buffer : null;

    await client.query('BEGIN');

    const loanRes = await client.query("SELECT * FROM Loans WHERE id = $1 FOR UPDATE", [loanId]);
    if (loanRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "Not found." });
    }
    const loan = loanRes.rows[0];

    if (req.user.role !== 'admin' && loan.branch_id !== req.user.branchId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: "Access Denied." });
    }
    if (loan.status !== 'active' && loan.status !== 'overdue') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: "Loan is not active." });
    }

    if (finalSalePrice > 0) {
      await client.query(
        "INSERT INTO Transactions (loan_id, amount_paid, payment_type, payment_date, changed_by_username) VALUES ($1, $2, 'sale', NOW(), $3)",
        [loanId, finalSalePrice, username]
      );
    }

    await client.query(
      `UPDATE Loans 
       SET status = 'forfeited', 
           closed_date = NOW(), 
           sale_price = $1, 
           forfeiture_signature_proof = $2, 
           forfeiture_photo_proof = $3 
       WHERE id = $4`,
      [finalSalePrice, signatureBuffer, photoBuffer, loanId]
    );

    await client.query(
      "INSERT INTO loan_history (loan_id, field_changed, old_value, new_value, changed_by_username) VALUES ($1, 'status', $2, 'forfeited', $3)",
      [loanId, loan.status, username]
    );

    await client.query('COMMIT');
    res.json({ message: "Loan forfeited successfully." });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).send("Server Error during forfeiture.");
  } finally {
    client.release();
  }
};

const undoForfeit = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const loanId = parseInt(req.params.id, 10);
    await client.query('BEGIN');

    const loanRes = await client.query("SELECT * FROM Loans WHERE id = $1 FOR UPDATE", [loanId]);
    if (loanRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "Not found" });
    }
    const loan = loanRes.rows[0];

    if (req.user.role !== 'admin' && loan.branch_id !== req.user.branchId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: "Access Denied" });
    }

    if (loan.status !== 'forfeited') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: "Loan is not in forfeited state." });
    }

    const dueDate = new Date(loan.due_date);
    const now = new Date();
    const newStatus = now > dueDate ? 'overdue' : 'active';

    await client.query(
      `UPDATE Loans 
       SET status = $1, 
           closed_date = NULL, 
           sale_price = NULL, 
           forfeiture_signature_proof = NULL, 
           forfeiture_photo_proof = NULL 
       WHERE id = $2`,
      [newStatus, loanId]
    );

    await client.query("DELETE FROM Transactions WHERE loan_id = $1 AND payment_type = 'sale'", [loanId]);

    await client.query(
      "INSERT INTO loan_history (loan_id, field_changed, old_value, new_value, changed_by_username) VALUES ($1, 'status', 'forfeited', $2, $3)",
      [loanId, newStatus, req.user.username]
    );

    await client.query('COMMIT');
    res.json({ message: `Forfeiture undone. Loan is now ${newStatus.toUpperCase()}.` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: "Failed to undo forfeiture." });
  } finally {
    client.release();
  }
};

const settleLoan = async (req, res) => {
  const client = await db.pool.connect();
  const username = req.user.username;
  try {
    const loanId = parseInt(req.params.id, 10);
    const { discountAmount, settlementAmount } = req.body;
    const discount = parseFloat(discountAmount) || 0;
    const finalPayment = parseFloat(settlementAmount) || 0;

    await client.query('BEGIN');
    const loanRes = await client.query("SELECT * FROM Loans WHERE id = $1 FOR UPDATE", [loanId]);
    const loan = loanRes.rows[0];

    if (req.user.role !== 'admin' && loan.branch_id !== req.user.branchId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: "Access Denied." });
    }

    const txRes = await client.query("SELECT * FROM Transactions WHERE loan_id = $1 ORDER BY payment_date ASC", [loanId]);
    const financials = calculateLoanFinancials(loan, txRes.rows);
    const outstandingInterest = parseFloat(financials.outstandingInterest);
    const totalDue = parseFloat(financials.amountDue);
    const remaining = totalDue - finalPayment - discount;

    if (remaining > 1.0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Insufficient funds. Due: ${totalDue}` });
    }

    if (finalPayment > 0) {
      let interestPart = 0;
      let principalPart = 0;

      const netInterestOwed = Math.max(0, outstandingInterest - discount);
      if (netInterestOwed > 0) {
        if (finalPayment >= netInterestOwed) {
          interestPart = netInterestOwed;
          principalPart = finalPayment - netInterestOwed;
        } else {
          interestPart = finalPayment;
        }
      } else {
        principalPart = finalPayment;
      }

      if (interestPart > 0) {
        await client.query(
          "INSERT INTO Transactions (loan_id, amount_paid, payment_type, payment_date, changed_by_username) VALUES ($1, $2, 'interest', NOW(), $3)",
          [loanId, interestPart, username]
        );
      }
      if (principalPart > 0) {
        await client.query(
          "INSERT INTO Transactions (loan_id, amount_paid, payment_type, payment_date, changed_by_username) VALUES ($1, $2, 'principal', NOW(), $3)",
          [loanId, principalPart, username]
        );
        const newPrincipal = Math.max(0, parseFloat(loan.principal_amount) - principalPart);
        await client.query("UPDATE Loans SET principal_amount = $1 WHERE id = $2", [newPrincipal, loanId]);
      }
    }

    if (discount > 0) {
      await client.query(
        "INSERT INTO Transactions (loan_id, amount_paid, payment_type, payment_date, changed_by_username) VALUES ($1, $2, 'discount', NOW(), $3)",
        [loanId, discount, username]
      );
    }

    await client.query("UPDATE Loans SET status = 'paid', closed_date = NOW() WHERE id = $1", [loanId]);
    await client.query('COMMIT');
    res.json({ message: "Settled" });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).send("Error");
  } finally {
    client.release();
  }
};

const deleteLoan = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const loanResult = await db.query("SELECT status, book_loan_number, branch_id FROM Loans WHERE id = $1", [id]);
    if (loanResult.rows.length === 0) return res.status(404).json({ error: "Not found." });
    const loan = loanResult.rows[0];

    if (req.user.role !== 'admin' && loan.branch_id !== req.user.branchId) {
      return res.status(403).json({ error: "Access Denied." });
    }
    if (loan.status === 'active' || loan.status === 'overdue') {
      return res.status(400).json({ error: "Settle first." });
    }

    const deleteLoanResult = await db.query("UPDATE Loans SET status = 'deleted' WHERE id = $1 RETURNING id, book_loan_number", [id]);
    res.json({ message: `Loan #${deleteLoanResult.rows[0].book_loan_number} recycled.` });
  } catch (err) {
    res.status(500).send("Error");
  }
};

const getLoanHistory = async (req, res) => {
  const { id } = req.params;
  const loanId = parseInt(id, 10);
  if (isNaN(loanId)) return res.status(400).json({ error: "Invalid ID." });

  const check = await db.query("SELECT branch_id FROM Loans WHERE id=$1", [loanId]);
  if (check.rows.length > 0 && req.user.role !== 'admin' && check.rows[0].branch_id !== req.user.branchId) {
    return res.status(403).json({ error: "Access Denied." });
  }

  try {
    const q = `
      (SELECT id, changed_at, changed_by_username, 'edit' AS event_type, field_changed, old_value, new_value, NULL AS amount_paid, NULL AS payment_type 
       FROM loan_history WHERE loan_id = $1) 
      UNION ALL 
      (SELECT id, payment_date AS changed_at, changed_by_username, 'transaction' AS event_type, NULL AS field_changed, NULL AS old_value, NULL AS new_value, amount_paid, payment_type 
       FROM Transactions WHERE loan_id = $1) 
      ORDER BY changed_at DESC
    `;
    const resH = await db.query(q, [loanId]);
    res.json(resH.rows);
  } catch (err) {
    res.status(500).send("Error");
  }
};

const restoreLoan = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const check = await db.query("SELECT branch_id FROM Loans WHERE id=$1", [id]);
    if (check.rows.length === 0) return res.status(404).send("Not found");

    if (req.user.role !== 'admin' && check.rows[0].branch_id !== req.user.branchId) {
      return res.status(403).send("Denied");
    }

    await db.query("UPDATE Loans SET status='paid' WHERE id=$1 AND status='deleted'", [id]);
    res.json({ message: "Restored." });
  } catch (err) {
    res.status(500).send("Error");
  }
};

const permanentDeleteLoan = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("DELETE FROM PledgedItems WHERE loan_id=$1", [id]);
    await client.query("DELETE FROM Transactions WHERE loan_id=$1", [id]);
    await client.query("DELETE FROM loan_history WHERE loan_id=$1", [id]);
    await client.query("DELETE FROM Loans WHERE id=$1 AND status='deleted'", [id]);
    await client.query('COMMIT');
    res.json({ message: "Deleted." });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).send("Error");
  } finally {
    client.release();
  }
};

module.exports = {
  listLoans,
  getRecentCreated,
  getRecentClosed,
  getOverdueLoans,
  findByBookNumber,
  getLoanById,
  createLoan,
  updateLoan,
  addPrincipal,
  renewLoan,
  forfeitLoan,
  undoForfeit,
  settleLoan,
  deleteLoan,
  getLoanHistory,
  restoreLoan,
  permanentDeleteLoan
};