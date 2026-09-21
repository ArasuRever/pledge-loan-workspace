const db = require('../config/db');
const { getTargetBranchId } = require('../middleware/auth.middleware');
const { getScopedLoanQuery, calculateLoanFinancials } = require('../utils/calculation.engine');
const { bufferToDataUrl } = require('../utils/image.utils');

const listLoans = async (req, res) => {
  try {
    const targetBranch = getTargetBranchId(req);
    if (targetBranch) {
      await db.query("UPDATE Loans SET status = 'overdue' WHERE due_date < NOW() AND LOWER(status) = 'active' AND branch_id = $1", [targetBranch]).catch(() => {});
    } else {
      await db.query("UPDATE Loans SET status = 'overdue' WHERE due_date < NOW() AND LOWER(status) = 'active'").catch(() => {});
    }

    let query = `
      SELECT 
        l.id, 
        l.book_loan_number, 
        COALESCE(
          NULLIF(l.principal_amount, 0),
          (SELECT SUM(t.amount_paid) FROM Transactions t WHERE t.loan_id = l.id AND t.payment_type IN ('principal', 'settlement')),
          (SELECT t.amount_paid FROM Transactions t WHERE t.loan_id = l.id AND t.payment_type = 'disbursement' ORDER BY t.payment_date ASC LIMIT 1),
          l.principal_amount
        ) AS principal_amount,
        l.interest_rate,
        l.pledge_date, 
        l.due_date, 
        l.closed_date,
        l.status, 
        l.created_at,
        c.name AS customer_name, 
        c.phone_number, 
        b.branch_name 
      FROM Loans l 
      JOIN Customers c ON l.customer_id = c.id 
      LEFT JOIN Branches b ON l.branch_id = b.id 
      WHERE LOWER(l.status) IN ('active', 'overdue', 'paid', 'forfeited') AND COALESCE(c.is_deleted, false) = false
    `;
    const params = [];
    if (targetBranch) {
      query += ` AND (l.branch_id = $1 OR l.branch_id IS NULL)`;
      params.push(targetBranch);
    }
    query += ` ORDER BY 
      CASE 
        WHEN LOWER(l.status) IN ('paid', 'forfeited') THEN COALESCE(l.closed_date, l.created_at)
        ELSE COALESCE(l.pledge_date, l.created_at)
      END DESC, 
      l.id DESC`;

    const allLoans = await db.query(query, params);
    res.json(allLoans.rows);
  } catch (err) {
    console.error("List Loans Error:", err);
    res.status(500).json({ error: err.message });
  }
};

const getRecentCreated = async (req, res) => {
  try {
    let base = `
      SELECT 
        l.id, 
        l.book_loan_number,
        COALESCE(
          NULLIF(l.principal_amount, 0),
          (SELECT t.amount_paid FROM Transactions t WHERE t.loan_id = l.id AND t.payment_type = 'disbursement' ORDER BY t.payment_date ASC LIMIT 1),
          l.principal_amount
        ) AS principal_amount, 
        c.name AS customer_name,
        COALESCE(l.pledge_date, l.created_at) AS event_date
      FROM Loans l 
      LEFT JOIN Customers c ON l.customer_id = c.id 
      WHERE LOWER(l.status) != 'deleted' AND COALESCE(c.is_deleted, false) = false
    `;
    const { q, params } = getScopedLoanQuery(base, req);
    const finalQ = q + ` ORDER BY COALESCE(l.pledge_date, l.created_at) DESC, l.id DESC LIMIT 5`;
    const result = await db.query(finalQ, params);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Recent Created Error:", err);
    res.status(500).json({ error: err.message, detail: err.detail });
  }
};

const getRecentClosed = async (req, res) => {
  try {
    let base = `
      SELECT 
        l.id, 
        l.book_loan_number,
        COALESCE(
          NULLIF(l.principal_amount, 0),
          (SELECT SUM(t.amount_paid) FROM Transactions t WHERE t.loan_id = l.id AND t.payment_type IN ('principal', 'settlement')),
          (SELECT t.amount_paid FROM Transactions t WHERE t.loan_id = l.id AND t.payment_type = 'disbursement' ORDER BY t.payment_date ASC LIMIT 1),
          l.principal_amount
        ) AS principal_amount, 
        c.name AS customer_name,
        COALESCE(l.closed_date, l.created_at) AS event_date
      FROM Loans l 
      LEFT JOIN Customers c ON l.customer_id = c.id 
      WHERE LOWER(l.status) = 'paid' AND COALESCE(c.is_deleted, false) = false
    `;
    const { q, params } = getScopedLoanQuery(base, req);
    const finalQ = q + ` ORDER BY COALESCE(l.closed_date, l.created_at) DESC, l.id DESC LIMIT 5`;
    const result = await db.query(finalQ, params);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Recent Closed Error:", err);
    res.status(500).json({ error: err.message, detail: err.detail });
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
    let query = `
      SELECT l.id, l.book_loan_number, l.status, c.name as customer_name 
      FROM Loans l 
      LEFT JOIN Customers c ON l.customer_id = c.id 
      WHERE LOWER(TRIM(l.book_loan_number)) = LOWER(TRIM($1)) AND LOWER(l.status) != 'deleted'
    `;
    let params = [bookNumber.trim()];
    if (targetBranch) {
      query += " AND l.branch_id = $2";
      params.push(targetBranch);
    }
    const result = await db.query(query, params);
    if (result.rows.length === 0) return res.status(404).json({ exists: false });
    res.json({ exists: true, loan: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
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

    // Fetch all multi-item articles for this loan including item_value
    const itemsRes = await db.query(
      "SELECT id, item_type, description, quality, gross_weight, net_weight, purity, COALESCE(item_value, 0) AS item_value, item_image_data FROM PledgedItems WHERE loan_id = $1 ORDER BY id ASC",
      [id]
    );
    loanDetails.items = itemsRes.rows.map(item => {
      if (item.item_image_data) {
        item.item_image_data_url = bufferToDataUrl(item.item_image_data);
        delete item.item_image_data;
      }
      return item;
    });

    if (loanDetails.items.length > 0) {
      if (!loanDetails.item_image_data && loanDetails.items[0].item_image_data_url) {
        loanDetails.item_image_data_url = loanDetails.items[0].item_image_data_url;
      }
      loanDetails.gross_weight = loanDetails.items.reduce((s, i) => s + parseFloat(i.gross_weight || 0), 0);
      loanDetails.net_weight = loanDetails.items.reduce((s, i) => s + parseFloat(i.net_weight || 0), 0);
    }

    if (loanDetails.item_image_data) {
      loanDetails.item_image_data_url = bufferToDataUrl(loanDetails.item_image_data);
      delete loanDetails.item_image_data;
    }

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
      appraised_value,
      deductFirstMonthInterest,
      item_type,
      description,
      quality,
      gross_weight,
      net_weight,
      purity
    } = req.body;

    const principal = parseFloat(principal_amount);
    const rate = parseFloat(interest_rate);

    if (!customer_id || isNaN(principal) || principal <= 0 || isNaN(rate) || rate <= 0 || !book_loan_number) {
      return res.status(400).json({ error: "Missing required loan fields." });
    }

    const customerCheck = await client.query("SELECT branch_id, is_deleted FROM Customers WHERE id = $1", [customer_id]);
    if (customerCheck.rows.length === 0 || customerCheck.rows[0].is_deleted) {
      return res.status(404).json({ error: "Customer not found." });
    }
    const custBranch = customerCheck.rows[0].branch_id;
    if (req.user.role !== 'admin' && custBranch !== req.user.branchId) {
      return res.status(403).json({ error: "Access Denied." });
    }

    // Parse multi-item array
    let itemsList = [];
    if (req.body.items) {
      try {
        itemsList = typeof req.body.items === 'string' ? JSON.parse(req.body.items) : req.body.items;
      } catch (e) {
        itemsList = [];
      }
    }

    if (!Array.isArray(itemsList) || itemsList.length === 0) {
      const finalGross = parseFloat(gross_weight || req.body.weight || 0);
      const finalNet = parseFloat(net_weight || finalGross);
      itemsList = [{
        item_type: item_type || 'Gold',
        description: description || '',
        quality: quality || purity || 'Good',
        gross_weight: finalGross,
        net_weight: finalNet,
        purity: purity || '22K (916)',
        item_amount: principal
      }];
    }

    await client.query('BEGIN');
    const loanQuery = `
      INSERT INTO Loans (customer_id, principal_amount, interest_rate, book_loan_number, appraised_value, branch_id) 
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
    `;
    const loanResult = await client.query(loanQuery, [customer_id, principal, rate, book_loan_number, appraised_value || principal, custBranch]);
    const newLoanId = loanResult.rows[0].id;

    // Helper to find photo buffer per item
    const getPhotoBufferForItem = (idx) => {
      if (!req.files || !Array.isArray(req.files)) return null;
      const match = req.files.find(f => f.fieldname === `itemPhoto_${idx}`);
      if (match) return match.buffer;
      if (idx === 0) {
        const legacy = req.files.find(f => f.fieldname === 'itemPhoto');
        if (legacy) return legacy.buffer;
      }
      return null;
    };

    for (let i = 0; i < itemsList.length; i++) {
      const it = itemsList[i];
      const gWt = parseFloat(it.gross_weight || 0);
      const nWt = parseFloat(it.net_weight || gWt);
      const itBuffer = getPhotoBufferForItem(i);

      const itemVal = parseFloat(it.item_amount || it.item_value || 0);
      const itemQuery = `
        INSERT INTO PledgedItems (loan_id, item_type, description, quality, weight, gross_weight, net_weight, purity, item_value, item_image_data) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;
      await client.query(itemQuery, [
        newLoanId,
        it.item_type || 'Gold',
        it.description || '',
        it.quality || it.purity || 'Good',
        gWt,
        gWt,
        nWt,
        it.purity || '22K (916)',
        itemVal,
        itBuffer
      ]);
    }

    if (deductFirstMonthInterest === 'true') {
      const firstMonthInterest = principal * (rate / 100);
      if (firstMonthInterest > 0) {
        await client.query(
          "INSERT INTO Transactions (loan_id, amount_paid, payment_type, payment_date, changed_by_username) VALUES ($1, $2, 'interest', NOW(), $3)",
          [newLoanId, firstMonthInterest, username]
        );
      }
    }

    // Log creation audit record
    await client.query(
      `INSERT INTO loan_history (loan_id, field_changed, old_value, new_value, changed_by_username) 
       VALUES ($1, 'creation', 'New Loan Created', $2, $3)`,
      [newLoanId, `Book #${book_loan_number.trim()} created with principal ₹${principal}`, username]
    );

    await client.query('COMMIT');
    res.status(201).json({ message: "Loan created successfully", loanId: newLoanId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("❌ Create Loan Error:", err);
    if (err.code === '23505') return res.status(400).json({ error: "Book Loan Number already exists." });
    res.status(500).json({ error: err.message });
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
    principal_amount
  } = req.body;

  if (isNaN(loanId) || loanId <= 0) return res.status(400).json({ error: "Invalid ID." });

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const checkLoan = await client.query("SELECT * FROM Loans WHERE id = $1 FOR UPDATE", [loanId]);
    if (checkLoan.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "Loan not found." });
    }
    const oldLoan = checkLoan.rows[0];

    if (req.user.role !== 'admin' && oldLoan.branch_id !== req.user.branchId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: "Access Denied." });
    }

    // 1. Update Core Loan Fields
    const updateLoanQuery = `
      UPDATE Loans 
      SET book_loan_number = COALESCE($1, book_loan_number),
          interest_rate = COALESCE($2, interest_rate),
          pledge_date = COALESCE($3, pledge_date),
          due_date = COALESCE($4, due_date),
          appraised_value = COALESCE($5, appraised_value),
          principal_amount = COALESCE($6, principal_amount)
      WHERE id = $7
    `;
    await client.query(updateLoanQuery, [
      book_loan_number ? book_loan_number.trim() : null,
      interest_rate ? parseFloat(interest_rate) : null,
      pledge_date ? pledge_date : null,
      due_date ? due_date : null,
      appraised_value ? parseFloat(appraised_value) : null,
      principal_amount ? parseFloat(principal_amount) : null,
      loanId
    ]);

    // 2. Handle Multi-Item Articles if provided
    let itemsList = [];
    if (req.body.items) {
      try {
        itemsList = typeof req.body.items === 'string' ? JSON.parse(req.body.items) : req.body.items;
      } catch (e) {
        itemsList = [];
      }
    }

    if (Array.isArray(itemsList) && itemsList.length > 0) {
      // Fetch existing images to preserve them if no new file is uploaded
      const existingItemsRes = await client.query("SELECT id, item_image_data FROM PledgedItems WHERE loan_id = $1", [loanId]);
      const existingImagesMap = new Map();
      existingItemsRes.rows.forEach(r => existingImagesMap.set(r.id, r.item_image_data));

      // Remove old items for this loan
      await client.query("DELETE FROM PledgedItems WHERE loan_id = $1", [loanId]);

      for (let i = 0; i < itemsList.length; i++) {
        const it = itemsList[i];
        const gWt = parseFloat(it.gross_weight || 0);
        const nWt = parseFloat(it.net_weight || gWt);
        const itemVal = parseFloat(it.item_value || it.item_amount || 0);

        // Check if a new file was uploaded for this item index
        let itemPhotoBuffer = null;
        if (req.files && Array.isArray(req.files)) {
          const match = req.files.find(f => f.fieldname === `itemPhoto_${i}`);
          if (match) itemPhotoBuffer = match.buffer;
        }

        // If no new photo, retain existing image if ID was passed
        if (!itemPhotoBuffer && it.id && existingImagesMap.has(it.id)) {
          itemPhotoBuffer = existingImagesMap.get(it.id);
        }

        const insertItemQuery = `
          INSERT INTO PledgedItems (
            loan_id, item_type, description, quality, weight, gross_weight, net_weight, purity, item_value, item_image_data
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `;
        await client.query(insertItemQuery, [
          loanId,
          it.item_type || 'Gold',
          it.description || '',
          it.quality || it.purity || 'Good',
          gWt,
          gWt,
          nWt,
          it.purity || '22K (916)',
          itemVal,
          itemPhotoBuffer
        ]);
      }
    }

    // 3. Handle Historical / Missed Transactions
    let missedTxs = [];
    if (req.body.missedTransactions) {
      try {
        missedTxs = typeof req.body.missedTransactions === 'string' ? JSON.parse(req.body.missedTransactions) : req.body.missedTransactions;
      } catch (e) {
        missedTxs = [];
      }
    }

    if (Array.isArray(missedTxs) && missedTxs.length > 0) {
      for (const tx of missedTxs) {
        const txAmount = parseFloat(tx.amount_paid);
        if (!isNaN(txAmount) && txAmount > 0) {
          const txType = ['interest', 'principal', 'disbursement'].includes(tx.payment_type) ? tx.payment_type : 'interest';
          const txDate = tx.payment_date || new Date().toISOString();

          await client.query(
            "INSERT INTO Transactions (loan_id, amount_paid, payment_type, payment_date, changed_by_username) VALUES ($1, $2, $3, $4, $5)",
            [loanId, txAmount, txType, txDate, username]
          );

          // If principal payment or disbursement, adjust current loan principal
          if (txType === 'principal') {
            await client.query("UPDATE Loans SET principal_amount = GREATEST(0, principal_amount - $1) WHERE id = $2", [txAmount, loanId]);
          } else if (txType === 'disbursement') {
            await client.query("UPDATE Loans SET principal_amount = principal_amount + $1 WHERE id = $2", [txAmount, loanId]);
          }
        }
      }
    }

    // 4. Log History
    await client.query(
      "INSERT INTO loan_history (loan_id, field_changed, old_value, new_value, changed_by_username) VALUES ($1, 'edit_loan', 'Full Edit', $2, $3)",
      [loanId, `Edited by ${username}`, username]
    );

    await client.query('COMMIT');
    res.json({ message: "Loan updated successfully" });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("❌ Update Loan Error:", err);
    res.status(500).json({ error: err.message });
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
    const { 
      newBookLoanNumber, 
      interestPaid, 
      principalPaid, 
      topUpAmount, 
      newInterestRate, 
      newPrincipal, 
      deductFirstMonthInterest 
    } = req.body;

    const intPaid = parseFloat(interestPaid) || 0;
    const prinPaid = parseFloat(principalPaid) || 0;
    const topUp = parseFloat(topUpAmount) || 0;
    const finalNewPrincipal = parseFloat(newPrincipal);
    const newRate = parseFloat(newInterestRate);

    if (!newBookLoanNumber || isNaN(finalNewPrincipal) || isNaN(newRate) || finalNewPrincipal <= 0) {
      return res.status(400).json({ error: "Invalid renewal data: Valid Book Number, Principal and Rate required." });
    }

    await client.query('BEGIN');

    // 1. Fetch Old Loan & Items
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
      return res.status(400).json({ error: "Loan must be active or overdue to renew." });
    }

    // Check if new book loan number already exists
    const checkBook = await client.query("SELECT id FROM Loans WHERE LOWER(TRIM(book_loan_number)) = LOWER(TRIM($1)) AND LOWER(status) != 'deleted'", [newBookLoanNumber.trim()]);
    if (checkBook.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Book Loan Number "${newBookLoanNumber}" already exists.` });
    }

    // 2. Log Payments on Old Loan
    if (intPaid > 0) {
      await client.query(
        "INSERT INTO Transactions (loan_id, amount_paid, payment_type, payment_date, changed_by_username) VALUES ($1, $2, 'interest', NOW(), $3)",
        [oldLoanId, intPaid, username]
      );
    }
    if (prinPaid > 0) {
      await client.query(
        "INSERT INTO Transactions (loan_id, amount_paid, payment_type, payment_date, changed_by_username) VALUES ($1, $2, 'principal', NOW(), $3)",
        [oldLoanId, prinPaid, username]
      );
      const reducedPrincipal = Math.max(0, parseFloat(oldLoan.principal_amount) - prinPaid);
      await client.query("UPDATE Loans SET principal_amount = $1 WHERE id = $2", [reducedPrincipal, oldLoanId]);
    }

    // 3. Close Old Loan
    await client.query("UPDATE Loans SET status = 'paid', closed_date = NOW(), principal_amount = 0 WHERE id = $1", [oldLoanId]);
    await client.query(
      "INSERT INTO loan_history (loan_id, field_changed, old_value, new_value, changed_by_username) VALUES ($1, 'status', 'renewed', $2, $3)",
      [oldLoanId, `Renewed to ${newBookLoanNumber}`, username]
    );

    // 4. Create New Loan
    const newLoanRes = await client.query(
      `INSERT INTO Loans (customer_id, principal_amount, interest_rate, book_loan_number, pledge_date, due_date, status, branch_id, appraised_value) 
       VALUES ($1, $2, $3, $4, NOW(), NOW() + INTERVAL '1 year', 'active', $5, $6) RETURNING id`,
      [oldLoan.customer_id, finalNewPrincipal, newRate, newBookLoanNumber.trim(), oldLoan.branch_id, oldLoan.appraised_value]
    );
    const newLoanId = newLoanRes.rows[0].id;

    // Record disbursement / initial loan creation transaction
    await client.query(
      "INSERT INTO Transactions (loan_id, amount_paid, payment_type, payment_date, changed_by_username) VALUES ($1, $2, 'disbursement', NOW(), $3)",
      [newLoanId, finalNewPrincipal, username]
    );

    // 5. Copy ALL Pledged Items to the New Loan (Multi-item support)
    const itemsRes = await client.query("SELECT * FROM PledgedItems WHERE loan_id = $1 ORDER BY id ASC", [oldLoanId]);
    for (const item of itemsRes.rows) {
      await client.query(
        `INSERT INTO PledgedItems (loan_id, item_type, description, quality, weight, gross_weight, net_weight, purity, item_value, item_image_data) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [newLoanId, item.item_type, item.description, item.quality, item.weight, item.gross_weight, item.net_weight, item.purity, item.item_value || 0, item.item_image_data]
      );
    }

    // 6. Handle First Month Interest Deduction (New Loan)
    if (deductFirstMonthInterest === true || deductFirstMonthInterest === 'true') {
      const firstMonthInt = finalNewPrincipal * (newRate / 100);
      if (firstMonthInt > 0) {
        await client.query(
          "INSERT INTO Transactions (loan_id, amount_paid, payment_type, payment_date, changed_by_username) VALUES ($1, $2, 'interest', NOW(), $3)",
          [newLoanId, firstMonthInt, username]
        );
      }
    }

    // Log creation audit record for the new renewed loan
    await client.query(
      `INSERT INTO loan_history (loan_id, field_changed, old_value, new_value, changed_by_username) 
       VALUES ($1, 'creation', 'Renewed Loan Created', $2, $3)`,
      [newLoanId, `Renewed from old loan #${oldLoan.book_loan_number} with principal ₹${finalNewPrincipal}`, username]
    );

    await client.query('COMMIT');
    res.json({ message: "Loan renewed successfully", newLoanId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("❌ Renew Loan Error:", err);
    res.status(500).json({ error: err.message });
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

    // 1. Validate Loan
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

    // 2. Record the 'Sale' as a transaction
    if (finalSalePrice > 0) {
      await client.query(
        "INSERT INTO Transactions (loan_id, amount_paid, payment_type, payment_date, changed_by_username) VALUES ($1, $2, 'sale', NOW(), $3)",
        [loanId, finalSalePrice, username]
      );
    }

    // 3. Update Loan Status and Save Proofs
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

    // 4. Log History
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

    // 1. Calculate New Status
    const dueDate = new Date(loan.due_date);
    const now = new Date();
    const newStatus = now > dueDate ? 'overdue' : 'active';

    // 2. Reset Loan Fields
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

    // 3. Delete 'sale' transaction
    await client.query("DELETE FROM Transactions WHERE loan_id = $1 AND payment_type = 'sale'", [loanId]);

    // 4. Audit Log
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

      // Deduct discount from interest owed first
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