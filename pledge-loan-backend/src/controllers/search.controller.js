const db = require('../config/db');
const { getTargetBranchId } = require('../middleware/auth.middleware');

const searchAll = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim() === '') return res.json([]);

    const cq = `%${q.trim()}%`;
    const targetBranch = getTargetBranchId(req);
    const p = [cq];

    let lSql = `SELECT id, book_loan_number, principal_amount, branch_id FROM Loans WHERE book_loan_number ILIKE $1 AND status!='deleted'`;
    let cSql = `SELECT id, name, phone_number, branch_id FROM Customers WHERE (name ILIKE $1 OR phone_number ILIKE $1) AND is_deleted=false`;

    if (targetBranch) {
      lSql += ` AND branch_id=$2`;
      cSql += ` AND branch_id=$2`;
      p.push(targetBranch);
    }

    const [lR, cR] = await Promise.all([
      db.query(lSql + " LIMIT 3", p),
      db.query(cSql + " LIMIT 5", p)
    ]);

    const resArr = [];
    lR.rows.forEach(l => resArr.push({ type: 'loan', id: l.id, title: `Loan #${l.book_loan_number}`, subtitle: `₹${l.principal_amount}` }));
    cR.rows.forEach(c => resArr.push({ type: 'customer', id: c.id, title: c.name, subtitle: c.phone_number }));

    res.json(resArr);
  } catch (err) {
    res.status(500).send("Error");
  }
};

module.exports = {
  searchAll
};