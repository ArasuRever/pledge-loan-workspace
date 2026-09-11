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
        "UPDATE Loans SET status = 'overdue' WHERE due_date < NOW() AND LOWER(status) = 'active'" +
        (targetBranch ? ` AND branch_id=${targetBranch}` : "")
      );
    } catch (updateErr) {
      console.warn("Notice: Auto-update overdue skipped:", updateErr.message);
    }

    // Top Level Metrics (Strictly 1 count/sum per loan)
    const [pRes, aRes, oRes, cRes, lRes, pdRes, fRes, dRes] = await Promise.all([
      db.query(`SELECT COALESCE(SUM(principal_amount), 0) as sum FROM Loans ${wc} AND (LOWER(status)='active' OR LOWER(status)='overdue')`, p),
      db.query(`SELECT COUNT(*) as count FROM Loans ${wc} AND (LOWER(status)='active' OR LOWER(status)='overdue')`, p),
      db.query(`SELECT COUNT(*) as count FROM Loans ${wc} AND LOWER(status)='overdue'`, p),
      db.query(`SELECT COUNT(*) as count FROM Customers ${wc} AND COALESCE(is_deleted, false)=false`, p),
      db.query(`SELECT COUNT(*) as count FROM Loans ${wc} AND LOWER(status)!='deleted'`, p),
      db.query(`SELECT COUNT(*) as count FROM Loans ${wc} AND LOWER(status)='paid'`, p),
      db.query(`SELECT COUNT(*) as count FROM Loans ${wc} AND LOWER(status)='forfeited'`, p),
      db.query(`SELECT COALESCE(SUM(principal_amount), 0) as sum FROM Loans ${wc} AND LOWER(status)!='deleted'`, p)
    ]);

    // Query UNIQUE active & overdue loans (no join multiplication)
    let lQ = `
      SELECT l.* 
      FROM Loans l 
      WHERE 1=1 AND (LOWER(l.status)='active' OR LOWER(l.status)='overdue')
    `;
    const lParams = [];
    if (targetBranch) {
      lQ += ` AND l.branch_id = $1`;
      lParams.push(targetBranch);
    }

    const lR = await db.query(lQ, lParams);

    let allItems = [];
    let allTxs = [];

    if (lR.rows.length > 0) {
      const ids = lR.rows.map(l => l.id);
      const [itemsRes, txsRes] = await Promise.all([
        db.query(`SELECT loan_id, item_type, description, gross_weight, net_weight FROM PledgedItems WHERE loan_id = ANY($1::int[])`, [ids]),
        db.query(`SELECT * FROM Transactions WHERE loan_id = ANY($1::int[])`, [ids])
      ]);
      allItems = itemsRes.rows;
      allTxs = txsRes.rows;
    }

    let totalInt = 0;
    const metalBreakdown = {
      Gold: { loanCount: 0, totalPrincipal: 0, totalInterest: 0, totalGrossWeight: 0, totalNetWeight: 0 },
      Silver: { loanCount: 0, totalPrincipal: 0, totalInterest: 0, totalGrossWeight: 0, totalNetWeight: 0 },
      Other: { loanCount: 0, totalPrincipal: 0, totalInterest: 0, totalGrossWeight: 0, totalNetWeight: 0 }
    };

    // Calculate per UNIQUE loan to prevent double counting
    for (const loan of lR.rows) {
      const txs = allTxs.filter(t => t.loan_id === loan.id);
      const fin = calculateLoanFinancials(loan, txs);
      const interest = parseFloat(fin.outstandingInterest || 0);
      const principal = parseFloat(loan.principal_amount || 0);

      // Accumulate global interest once per unique loan
      totalInt += interest;

      // Find all articles for this specific loan
      const loanArticles = allItems.filter(i => i.loan_id === loan.id);
      
      const goldArticles = loanArticles.filter(i => (i.item_type || '').toLowerCase().includes('gold'));
      const silverArticles = loanArticles.filter(i => (i.item_type || '').toLowerCase().includes('silver'));
      const otherArticles = loanArticles.filter(i => !(i.item_type || '').toLowerCase().includes('gold') && !(i.item_type || '').toLowerCase().includes('silver'));

      // Accumulate weights strictly by metal type
      goldArticles.forEach(a => {
        metalBreakdown.Gold.totalGrossWeight += parseFloat(a.gross_weight || 0);
        metalBreakdown.Gold.totalNetWeight += parseFloat(a.net_weight || a.gross_weight || 0);
      });
      silverArticles.forEach(a => {
        metalBreakdown.Silver.totalGrossWeight += parseFloat(a.gross_weight || 0);
        metalBreakdown.Silver.totalNetWeight += parseFloat(a.net_weight || a.gross_weight || 0);
      });
      otherArticles.forEach(a => {
        metalBreakdown.Other.totalGrossWeight += parseFloat(a.gross_weight || 0);
        metalBreakdown.Other.totalNetWeight += parseFloat(a.net_weight || a.gross_weight || 0);
      });

      const hasGold = goldArticles.length > 0;
      const hasSilver = silverArticles.length > 0;
      const hasOther = otherArticles.length > 0;

      if (hasGold && !hasSilver && !hasOther) {
        // Pure Gold Loan
        metalBreakdown.Gold.loanCount += 1;
        metalBreakdown.Gold.totalPrincipal += principal;
        metalBreakdown.Gold.totalInterest += interest;
      } else if (hasSilver && !hasGold && !hasOther) {
        // Pure Silver Loan
        metalBreakdown.Silver.loanCount += 1;
        metalBreakdown.Silver.totalPrincipal += principal;
        metalBreakdown.Silver.totalInterest += interest;
      } else if (hasGold && hasSilver) {
        // Mixed Gold & Silver Loan
        metalBreakdown.Gold.loanCount += 1;
        metalBreakdown.Silver.loanCount += 1;

        const goldWeight = goldArticles.reduce((s, i) => s + parseFloat(i.net_weight || i.gross_weight || 0), 0);
        const silverWeight = silverArticles.reduce((s, i) => s + parseFloat(i.net_weight || i.gross_weight || 0), 0);

        // Proportional valuation split (reflecting gold-to-silver value density)
        const goldEstVal = goldWeight * 6500;
        const silverEstVal = silverWeight * 90;
        const totalEstVal = (goldEstVal + silverEstVal) || 1;

        const goldShare = goldEstVal / totalEstVal;
        const silverShare = silverEstVal / totalEstVal;

        metalBreakdown.Gold.totalPrincipal += (principal * goldShare);
        metalBreakdown.Gold.totalInterest += (interest * goldShare);

        metalBreakdown.Silver.totalPrincipal += (principal * silverShare);
        metalBreakdown.Silver.totalInterest += (interest * silverShare);
      } else {
        metalBreakdown.Other.loanCount += 1;
        metalBreakdown.Other.totalPrincipal += principal;
        metalBreakdown.Other.totalInterest += interest;
      }
    }

    res.json({
      totalPrincipalOut: parseFloat(pRes.rows[0].sum || 0),
      totalInterestAccrued: Math.round(totalInt),
      totalActiveLoans: parseInt(aRes.rows[0].count || 0, 10),
      totalOverdueLoans: parseInt(oRes.rows[0].count || 0, 10),
      totalCustomers: parseInt(cRes.rows[0].count || 0, 10),
      totalLoans: parseInt(lRes.rows[0].count || 0, 10),
      totalValue: parseFloat(dRes.rows[0].sum || 0),
      loansActive: parseInt(aRes.rows[0].count || 0, 10),
      loansOverdue: parseInt(oRes.rows[0].count || 0, 10),
      loansPaid: parseInt(pdRes.rows[0].count || 0, 10),
      loansForfeited: parseInt(fRes.rows[0].count || 0, 10),
      metalBreakdown: {
        Gold: {
          loanCount: metalBreakdown.Gold.loanCount,
          totalPrincipal: Math.round(metalBreakdown.Gold.totalPrincipal),
          totalInterest: Math.round(metalBreakdown.Gold.totalInterest),
          totalGrossWeight: parseFloat(metalBreakdown.Gold.totalGrossWeight.toFixed(3)),
          totalNetWeight: parseFloat(metalBreakdown.Gold.totalNetWeight.toFixed(3))
        },
        Silver: {
          loanCount: metalBreakdown.Silver.loanCount,
          totalPrincipal: Math.round(metalBreakdown.Silver.totalPrincipal),
          totalInterest: Math.round(metalBreakdown.Silver.totalInterest),
          totalGrossWeight: parseFloat(metalBreakdown.Silver.totalGrossWeight.toFixed(3)),
          totalNetWeight: parseFloat(metalBreakdown.Silver.totalNetWeight.toFixed(3))
        },
        Other: {
          loanCount: metalBreakdown.Other.loanCount,
          totalPrincipal: Math.round(metalBreakdown.Other.totalPrincipal),
          totalInterest: Math.round(metalBreakdown.Other.totalInterest),
          totalGrossWeight: parseFloat(metalBreakdown.Other.totalGrossWeight.toFixed(3)),
          totalNetWeight: parseFloat(metalBreakdown.Other.totalNetWeight.toFixed(3))
        }
      }
    });
  } catch (err) {
    console.error("❌ Dashboard Stats Error:", err);
    res.status(500).json({ error: err.message, detail: err.detail });
  }
};

module.exports = {
  getDashboardStats
};