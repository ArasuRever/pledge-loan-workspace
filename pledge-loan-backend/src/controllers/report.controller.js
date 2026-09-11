const db = require('../config/db');
const { getTargetBranchId } = require('../middleware/auth.middleware');

const getFinancialSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ error: "Required." });

    const targetBranch = getTargetBranchId(req);
    const p = [startDate, endDate];
    let bc = "";
    if (targetBranch) {
      bc = " AND l.branch_id = $3";
      p.push(targetBranch);
    }

    const q1 = `SELECT SUM(t.amount_paid) as total FROM Transactions t JOIN Loans l ON t.loan_id=l.id WHERE t.payment_type='disbursement' AND t.payment_date >= $1 AND t.payment_date <= $2 ${bc}`;
    const q2 = `SELECT SUM(t.amount_paid) as total FROM Transactions t JOIN Loans l ON t.loan_id=l.id WHERE t.payment_type='interest' AND t.payment_date >= $1 AND t.payment_date <= $2 ${bc}`;
    const q3 = `SELECT SUM(t.amount_paid) as total FROM Transactions t JOIN Loans l ON t.loan_id=l.id WHERE (t.payment_type='principal' OR t.payment_type='settlement') AND t.payment_date >= $1 AND t.payment_date <= $2 ${bc}`;
    const q4 = `SELECT SUM(t.amount_paid) as total FROM Transactions t JOIN Loans l ON t.loan_id=l.id WHERE t.payment_type='discount' AND t.payment_date >= $1 AND t.payment_date <= $2 ${bc}`;
    const q5 = `SELECT COUNT(*) as count FROM Loans l WHERE l.pledge_date >= $1 AND l.pledge_date <= $2 ${targetBranch ? 'AND l.branch_id = $3' : ''}`;

    const [r1, r2, r3, r4, r5] = await Promise.all([
      db.query(q1, p),
      db.query(q2, p),
      db.query(q3, p),
      db.query(q4, p),
      db.query(q5, p)
    ]);

    res.json({
      startDate,
      endDate,
      totalDisbursed: parseFloat(r1.rows[0].total || 0),
      totalInterest: parseFloat(r2.rows[0].total || 0),
      totalPrincipalRepaid: parseFloat(r3.rows[0].total || 0),
      totalDiscount: parseFloat(r4.rows[0].total || 0),
      netProfit: parseFloat(r2.rows[0].total || 0) - parseFloat(r4.rows[0].total || 0),
      loansCreatedCount: parseInt(r5.rows[0].count || 0, 10)
    });
  } catch (err) {
    res.status(500).send("Error");
  }
};

const getDayBook = async (req, res) => {
  try {
    const dateParam = req.query.date;
    if (!dateParam) return res.status(400).json({ error: "Date required" });

    const targetBranch = getTargetBranchId(req);
    const p = [dateParam];
    let bc = "";
    if (targetBranch) {
      bc = " AND l.branch_id = $2";
      p.push(targetBranch);
    }

    const q1 = `
      SELECT SUM(CASE WHEN t.payment_type IN ('interest','principal','settlement') THEN t.amount_paid ELSE 0 END) - 
             SUM(CASE WHEN t.payment_type='disbursement' THEN t.amount_paid ELSE 0 END) as balance 
      FROM Transactions t 
      JOIN Loans l ON t.loan_id=l.id 
      WHERE (t.payment_date AT TIME ZONE 'Asia/Kolkata')::date < $1::date ${bc}
    `;

    const q2 = `
      SELECT t.*, l.book_loan_number, c.name as customer_name 
      FROM Transactions t 
      JOIN Loans l ON t.loan_id=l.id 
      JOIN Customers c ON l.customer_id=c.id 
      WHERE (t.payment_date AT TIME ZONE 'Asia/Kolkata')::date = $1::date AND t.payment_type != 'discount' ${bc} 
      ORDER BY t.payment_date ASC
    `;

    const [r1, r2] = await Promise.all([db.query(q1, p), db.query(q2, p)]);
    res.json({
      date: dateParam,
      openingBalance: parseFloat(r1.rows[0].balance || 0),
      transactions: r2.rows
    });
  } catch (err) {
    res.status(500).send("Error");
  }
};

module.exports = {
  getFinancialSummary,
  getDayBook
};