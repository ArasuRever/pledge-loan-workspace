const db = require('../config/db');
const { calculateLoanFinancials } = require('../utils/calculation.engine');

const createTransaction = async (req, res) => {
  const client = await db.pool.connect();
  const username = req.user.username;
  try {
    const { loan_id, amount_paid, payment_type, custom_date } = req.body;
    const loanId = parseInt(loan_id, 10);
    const paymentAmount = parseFloat(amount_paid);

    let paymentDate;
    if (custom_date) {
      paymentDate = new Date(`${custom_date}T12:00:00`);
    } else {
      paymentDate = new Date();
    }

    const isBackdated = !!custom_date;

    await client.query('BEGIN');
    const loanCheck = await client.query("SELECT * FROM Loans WHERE id = $1 FOR UPDATE", [loanId]);
    if (loanCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "Not found." });
    }
    const loan = loanCheck.rows[0];

    if (req.user.role !== 'admin' && loan.branch_id !== req.user.branchId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: "Access Denied." });
    }

    if (['paid', 'forfeited'].includes(loan.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: "Loan is closed/forfeited. Revert status to add transactions." });
    }

    const pledgeDate = new Date(loan.pledge_date);
    const pDateString = pledgeDate.toISOString().split('T')[0];
    const txDateString = paymentDate.toISOString().split('T')[0];

    if (new Date(txDateString) < new Date(pDateString)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Date cannot be before Pledge Date (${pDateString})` });
    }

    if (payment_type === 'disbursement') {
      const newPrincipal = parseFloat(loan.principal_amount) + paymentAmount;
      await client.query("UPDATE Loans SET principal_amount = $1 WHERE id = $2", [newPrincipal, loanId]);
    } else if (payment_type === 'principal' || payment_type === 'settlement') {
      const newPrincipal = Math.max(0, parseFloat(loan.principal_amount) - paymentAmount);
      await client.query("UPDATE Loans SET principal_amount = $1 WHERE id = $2", [newPrincipal, loanId]);
    }

    if (payment_type === 'interest' && !isBackdated) {
      const txRes = await client.query("SELECT * FROM Transactions WHERE loan_id = $1 ORDER BY payment_date ASC", [loanId]);
      const financials = calculateLoanFinancials(loan, txRes.rows);
      const outstandingInterest = parseFloat(financials.outstandingInterest);

      if (paymentAmount > outstandingInterest) {
        const interestPart = outstandingInterest > 0 ? outstandingInterest : 0;
        const principalPart = paymentAmount - interestPart;
        let txs = [];

        if (interestPart > 0) {
          const r = await client.query(
            "INSERT INTO Transactions (loan_id, amount_paid, payment_type, payment_date, changed_by_username) VALUES ($1, $2, 'interest', $3, $4) RETURNING *",
            [loanId, interestPart, paymentDate, username]
          );
          txs.push(r.rows[0]);
        }

        if (principalPart > 0) {
          const r2 = await client.query(
            "INSERT INTO Transactions (loan_id, amount_paid, payment_type, payment_date, changed_by_username) VALUES ($1, $2, 'principal', $3, $4) RETURNING *",
            [loanId, principalPart, paymentDate, username]
          );
          txs.push(r2.rows[0]);

          const newPrincipal = Math.max(0, parseFloat(loan.principal_amount) - principalPart);
          await client.query("UPDATE Loans SET principal_amount = $1 WHERE id = $2", [newPrincipal, loanId]);
        }

        await client.query('COMMIT');
        return res.status(201).json(txs);
      }
    }

    const newTx = await client.query(
      "INSERT INTO Transactions (loan_id, amount_paid, payment_type, payment_date, changed_by_username) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [loanId, paymentAmount, payment_type, paymentDate, username]
    );

    if (isBackdated) {
      await client.query(
        "INSERT INTO loan_history (loan_id, field_changed, old_value, new_value, changed_by_username) VALUES ($1, 'manual_transaction', 'added', $2, $3)",
        [loanId, `${payment_type}: ${paymentAmount} on ${txDateString}`, username]
      );
    }

    await client.query('COMMIT');
    res.status(201).json([newTx.rows[0]]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).send("Error");
  } finally {
    client.release();
  }
};

const deleteTransaction = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const txId = parseInt(req.params.id, 10);
    await client.query('BEGIN');

    const txRes = await client.query("SELECT * FROM Transactions WHERE id = $1 FOR UPDATE", [txId]);
    if (txRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "Transaction not found" });
    }
    const tx = txRes.rows[0];
    const loanId = tx.loan_id;

    const loanRes = await client.query("SELECT * FROM Loans WHERE id = $1 FOR UPDATE", [loanId]);
    const loan = loanRes.rows[0];

    if (req.user.role !== 'admin' && loan.branch_id !== req.user.branchId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: "Access Denied" });
    }

    if (tx.payment_type === 'disbursement') {
      const newPrincipal = parseFloat(loan.principal_amount) - parseFloat(tx.amount_paid);
      if (newPrincipal < 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: "Cannot delete: Resulting principal would be negative." });
      }
      await client.query("UPDATE Loans SET principal_amount = $1 WHERE id = $2", [newPrincipal, loanId]);
    } else if (tx.payment_type === 'principal' || tx.payment_type === 'settlement') {
      const newPrincipal = parseFloat(loan.principal_amount) + parseFloat(tx.amount_paid);
      await client.query("UPDATE Loans SET principal_amount = $1 WHERE id = $2", [newPrincipal, loanId]);
    }

    if (loan.status === 'paid' || loan.status === 'forfeited') {
      const dueDate = new Date(loan.due_date);
      const now = new Date();
      const newStatus = now > dueDate ? 'overdue' : 'active';
      await client.query("UPDATE Loans SET status = $1, closed_date = NULL WHERE id = $2", [newStatus, loanId]);
    }

    await client.query("DELETE FROM Transactions WHERE id = $1", [txId]);

    await client.query(
      "INSERT INTO loan_history (loan_id, field_changed, old_value, new_value, changed_by_username) VALUES ($1, 'transaction_deleted', $2, 'deleted', $3)",
      [loanId, `ID:${txId} Type:${tx.payment_type} Amt:${tx.amount_paid}`, req.user.username]
    );

    await client.query('COMMIT');
    res.json({ message: "Transaction deleted successfully." });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: "Failed to delete transaction." });
  } finally {
    client.release();
  }
};

module.exports = {
  createTransaction,
  deleteTransaction
};