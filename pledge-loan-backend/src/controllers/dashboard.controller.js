const db = require('../config/db');
const { getTargetBranchId } = require('../middleware/auth.middleware');
const { calculateLoanFinancials } = require('../utils/calculation.engine');

const getDashboardStats = async (req, res) => {
  try {
    const targetBranch = getTargetBranchId(req);
    let wc = " WHERE 1=1 ";
    const p = [];
    if (targetBranch) {
      wc += ` AND branch_id = $1`;
      p.push(targetBranch);
    }

    try {
      await db.query(
        "UPDATE Loans SET status = 'overdue' WHERE due_date < NOW() AND status = 'active'" +
        (targetBranch ? ` AND branch_id=${targetBranch}` : "")
      );
    } catch (updateErr) {
      console.warn("Notice: Auto-update overdue skipped:", updateErr.message);
    }

    const [pRes, aRes, oRes, cRes, lRes, pdRes, fRes, dRes] = await Promise.all([
      db.query(`SELECT COALESCE(SUM(principal_amount), 0) as sum FROM Loans ${wc} AND (status='active' OR status='overdue')`, p),
      db.query(`SELECT COUNT(*) as count FROM Loans ${wc} AND (status='active' OR status='overdue')`, p),
      db.query(`SELECT COUNT(*) as count FROM Loans ${wc} AND status='overdue'`, p),
      db.query(`SELECT COUNT(*) as count FROM Customers ${wc} AND is_deleted=false`, p),
      db.query(`SELECT COUNT(*) as count FROM Loans ${wc} AND status!='deleted'`, p),
      db.query(`SELECT COUNT(*) as count FROM Loans ${wc} AND status='paid'`, p),
      db.query(`SELECT COUNT(*) as count FROM Loans ${wc} AND status='forfeited'`, p),
      db.query(`SELECT COALESCE(SUM(principal_amount), 0) as sum FROM Loans ${wc} AND status!='deleted'`, p)
    ]);

    let totalInt = 0;
    const lQ = `SELECT * FROM Loans ${wc} AND (status='active' OR status='overdue')`;
    const lR = await db.query(lQ, p);
    if (lR.rows.length > 0) {
      const ids = lR.rows.map(l => l.id);
      const tR = await db.query(`SELECT * FROM Transactions WHERE loan_id = ANY($1::int[])`, [ids]);
      for (const loan of lR.rows) {
        const txs = tR.rows.filter(t => t.loan_id === loan.id);
        const fin = calculateLoanFinancials(loan, txs);
        totalInt += parseFloat(fin.outstandingInterest || 0);
      }
    }

    res.json({
      totalPrincipalOut: parseFloat(pRes.rows[0].sum || 0),
      totalInterestAccrued: totalInt,
      totalActiveLoans: parseInt(aRes.rows[0].count || 0, 10),
      totalOverdueLoans: parseInt(oRes.rows[0].count || 0, 10),
      totalCustomers: parseInt(cRes.rows[0].count || 0, 10),
      totalLoans: parseInt(lRes.rows[0].count || 0, 10),
      totalValue: parseFloat(dRes.rows[0].sum || 0),
      loansActive: parseInt(aRes.rows[0].count || 0, 10),
      loansOverdue: parseInt(oRes.rows[0].count || 0, 10),
      loansPaid: parseInt(pdRes.rows[0].count || 0, 10),
      loansForfeited: parseInt(fRes.rows[0].count || 0, 10)
    });
  } catch (err) {
    console.error("❌ Dashboard Stats Error:", err);
    res.status(500).json({ error: err.message, detail: err.detail });
  }
};

module.exports = {
  getDashboardStats
};