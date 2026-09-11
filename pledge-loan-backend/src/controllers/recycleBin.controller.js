const db = require('../config/db');
const { getTargetBranchId } = require('../middleware/auth.middleware');

const getDeletedItems = async (req, res) => {
  try {
    const targetBranch = getTargetBranchId(req);
    const p = [];
    let cw = " WHERE is_deleted=true";
    let lw = " WHERE l.status='deleted' AND c.is_deleted=false";

    if (targetBranch) {
      cw += " AND branch_id=$1";
      lw += " AND l.branch_id=$1";
      p.push(targetBranch);
    }

    const [c, l] = await Promise.all([
      db.query(`SELECT id, name, phone_number, 'Customer' as type FROM Customers ${cw}`, p),
      db.query(`SELECT l.id, l.book_loan_number, c.name as customer_name, 'Loan' as type FROM Loans l JOIN Customers c ON l.customer_id=c.id ${lw}`, p)
    ]);

    res.json({
      customers: c.rows,
      loans: l.rows
    });
  } catch (err) {
    res.status(500).send("Error");
  }
};

module.exports = {
  getDeletedItems
};