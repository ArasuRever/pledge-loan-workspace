const { parseDate } = require('./date.utils');

/**
 * Robust 15-Day Split & Minimum 1 Month Gold Loan Duration Calculation
 */
const calculateGoldLoanMonths = (startDate, endDate, isCarryOver = false) => {
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  if (end.getTime() <= start.getTime()) {
    return isCarryOver ? 0.0 : 1.0;
  }

  let tempDate = new Date(start);
  let fullMonths = 0;

  while (true) {
    let nextMonth = new Date(tempDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    if (nextMonth.getDate() !== tempDate.getDate()) {
      nextMonth.setDate(0);
    }

    if (nextMonth > end) break;
    tempDate = nextMonth;
    fullMonths++;
  }

  const oneDay = 1000 * 60 * 60 * 24;
  const diffTime = Math.abs(end - tempDate);
  const diffDays = Math.ceil(diffTime / oneDay);

  let extra = 0.0;
  if (diffDays === 0) {
    extra = 0.0;
  } else if (diffDays <= 15) {
    extra = 0.5;
  } else {
    extra = 1.0;
  }

  let total = fullMonths + extra;

  if (!isCarryOver && total < 1.0) return 1.0;

  return total;
};

/**
 * Helper to scope SQL query by Branch ID depending on caller role
 */
const getScopedLoanQuery = (baseQuery, req) => {
  const { role, branchId } = req.user;
  const params = [];
  let q = baseQuery;

  if (role === 'admin') {
    const qBranch = req.query.branchId;
    if (qBranch && qBranch !== 'all') {
      q += ` AND l.branch_id = $${params.length + 1}`;
      params.push(parseInt(qBranch, 10));
    }
  } else {
    q += ` AND l.branch_id = $${params.length + 1}`;
    params.push(branchId);
  }
  return { q, params };
};

/**
 * Cumulative Gold Loan Financial Calculation Engine
 */
const calculateLoanFinancials = (loan, transactions) => {
  const rate = parseFloat(loan.interest_rate) / 100;

  let endDate = new Date();
  if ((loan.status === 'paid' || loan.status === 'forfeited') && loan.closed_date) {
    endDate = parseDate(loan.closed_date);
  } else {
    const now = new Date();
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
  }

  let rawEvents = [];

  // Reconstruct Initial Principal
  const principalRepaidSum = transactions
    .filter(t => ['principal', 'settlement'].includes(t.payment_type))
    .reduce((sum, t) => sum + parseFloat(t.amount_paid), 0);

  const topUpSum = transactions
    .filter(t => t.payment_type === 'disbursement')
    .reduce((sum, t) => sum + parseFloat(t.amount_paid), 0);

  const currentBalance = parseFloat(loan.principal_amount);
  const initialPrincipal = currentBalance + principalRepaidSum - topUpSum;

  if (initialPrincipal > 0.01) {
    rawEvents.push({
      type: 'disburse',
      date: parseDate(loan.pledge_date),
      amount: initialPrincipal,
      isInitial: true
    });
  }

  // Transactions
  transactions.forEach(t => {
    const d = parseDate(t.payment_date);
    const amt = parseFloat(t.amount_paid);

    if ((loan.status === 'paid' || loan.status === 'forfeited') && d > endDate) {
      return;
    }

    if (t.payment_type === 'disbursement') {
      rawEvents.push({ type: 'disburse', date: d, amount: amt });
    } else if (['interest', 'principal', 'settlement'].includes(t.payment_type)) {
      rawEvents.push({ type: 'payment', date: d, amount: amt, originalType: t.payment_type });
    } else if (t.payment_type === 'discount') {
      rawEvents.push({ type: 'discount', date: d, amount: amt });
    } else if (t.payment_type === 'sale') {
      rawEvents.push({ type: 'payment', date: d, amount: amt, originalType: 'sale' });
    }
  });

  // Group Events by Date
  const eventsMap = new Map();
  rawEvents.forEach(ev => {
    const dateKey = ev.date.getTime();
    if (!eventsMap.has(dateKey)) {
      eventsMap.set(dateKey, {
        date: ev.date,
        disburse: 0,
        payment: 0,
        discount: 0,
        types: new Set(),
        topupDetails: []
      });
    }
    const group = eventsMap.get(dateKey);
    if (ev.type === 'disburse') {
      group.disburse += ev.amount;
      group.topupDetails.push({ amount: ev.amount, isInitial: ev.isInitial });
    } else if (ev.type === 'payment') {
      group.payment += ev.amount;
      group.types.add(ev.originalType);
    } else if (ev.type === 'discount') {
      group.discount += ev.amount;
    }
  });

  const processedEvents = Array.from(eventsMap.values()).sort((a, b) => a.date - b.date);

  processedEvents.push({
    date: endDate,
    isReport: true,
    disburse: 0,
    payment: 0,
    discount: 0,
    types: new Set(),
    topupDetails: []
  });

  // Cumulative Calculation Loop
  let activePrincipals = [];
  let accruedInterestSnapshot = 0;
  let totalPrincipalPaid = 0;
  let totalInterestPaid = 0;
  let totalDiscount = 0;
  let breakdown = [];
  let interestPaidOnCurrentBuckets = 0;

  for (let i = 0; i < processedEvents.length; i++) {
    const event = processedEvents[i];
    const evtDate = event.date;

    // 1. Handle New Disbursements
    if (event.disburse > 0) {
      event.topupDetails.forEach(detail => {
        activePrincipals.push({
          amount: detail.amount,
          startDate: evtDate,
          accruedSoFar: 0,
          label: detail.isInitial ? "Initial Principal" : "Top-up",
          isCarryOver: false,
          lastAccruedDate: evtDate
        });
        breakdown.push({
          label: detail.isInitial ? "Principal Disbursed" : "Principal Top-up",
          amount: detail.amount,
          date: evtDate.toISOString(),
          status: 'disbursement'
        });
      });
    }

    // 2. Accrue Interest
    let currentRows = [];
    activePrincipals.forEach((p) => {
      const totalMonths = calculateGoldLoanMonths(p.startDate, evtDate, p.isCarryOver);
      const totalExpectedInterest = p.amount * rate * totalMonths;

      let deltaInterest = totalExpectedInterest - p.accruedSoFar;
      if (deltaInterest < 0.01) deltaInterest = 0;

      if (deltaInterest > 0) {
        currentRows.push({
          label: `Int. on ${p.amount} (${p.label})`,
          date: p.lastAccruedDate.toISOString(),
          endDate: evtDate.toISOString(),
          amount: p.amount,
          grossInterest: deltaInterest,
          rate: rate,
          status: 'accrued'
        });

        p.accruedSoFar += deltaInterest;
        accruedInterestSnapshot += deltaInterest;
        p.lastAccruedDate = evtDate;
      }
    });

    if (currentRows.length > 0) {
      if (interestPaidOnCurrentBuckets > 0) {
        let paidRemaining = interestPaidOnCurrentBuckets;
        currentRows.forEach(row => {
          if (paidRemaining > 0) {
            const deduction = Math.min(row.grossInterest, paidRemaining);
            row.grossInterest -= deduction;
            paidRemaining -= deduction;
          }
          const netMonths = row.grossInterest / (row.amount * row.rate);
          row.months = isFinite(netMonths) ? netMonths : 0;
          row.interest = Math.round(row.grossInterest);
          row.amount = Math.round(row.amount);
          if (row.grossInterest > 0) breakdown.push(row);
        });
        interestPaidOnCurrentBuckets = paidRemaining;
      } else {
        currentRows.forEach(row => {
          const netMonths = row.grossInterest / (row.amount * row.rate);
          row.months = isFinite(netMonths) ? netMonths : 0;
          row.interest = Math.round(row.grossInterest);
          row.amount = Math.round(row.amount);
          breakdown.push(row);
        });
      }
    }

    // 3. Apply Discount
    if (event.discount > 0) {
      totalDiscount += event.discount;
      const netInterestOwed = Math.max(0, accruedInterestSnapshot);
      const discountCoveringInterest = Math.min(event.discount, netInterestOwed);

      if (discountCoveringInterest > 0) {
        accruedInterestSnapshot -= discountCoveringInterest;
      }

      const remainingDiscount = event.discount - discountCoveringInterest;
      if (remainingDiscount > 0) {
        const totalActive = activePrincipals.reduce((s, p) => s + p.amount, 0);
        const newBal = Math.max(0, totalActive - remainingDiscount);
        if (newBal <= 0.5) {
          activePrincipals = [];
          accruedInterestSnapshot = 0;
        } else {
          activePrincipals = [{
            amount: newBal,
            startDate: evtDate,
            accruedSoFar: 0,
            label: "Balance c/f",
            isCarryOver: true,
            lastAccruedDate: evtDate
          }];
        }
      }
      breakdown.push({
        label: "Discount Applied",
        amount: Math.round(-event.discount),
        date: evtDate.toISOString(),
        status: 'payment'
      });
    }

    // 4. Apply Payment
    if (event.payment > 0) {
      let paymentAmount = event.payment;
      const interestCovered = Math.min(paymentAmount, accruedInterestSnapshot);
      totalInterestPaid += interestCovered;
      accruedInterestSnapshot -= interestCovered;
      paymentAmount -= interestCovered;

      if (paymentAmount > 0) {
        totalPrincipalPaid += paymentAmount;
        const totalActivePrincipal = activePrincipals.reduce((sum, p) => sum + p.amount, 0);
        const newPrincipalBalance = totalActivePrincipal - paymentAmount;

        if (newPrincipalBalance <= 0.5) {
          activePrincipals = [];
          accruedInterestSnapshot = 0;
        } else {
          activePrincipals = [{
            amount: newPrincipalBalance,
            startDate: evtDate,
            accruedSoFar: 0,
            label: "Balance c/f",
            isCarryOver: true,
            lastAccruedDate: evtDate
          }];
        }
      }

      breakdown.push({
        label: `Payment Received (${Array.from(event.types).join('+')})`,
        amount: Math.round(-event.payment),
        date: evtDate.toISOString(),
        status: 'payment'
      });
    }
  }

  let currentPrincipal = activePrincipals.reduce((sum, p) => sum + p.amount, 0);
  let finalOutstandingInterest = accruedInterestSnapshot;

  if (loan.status === 'paid' || loan.status === 'forfeited') {
    if (currentPrincipal < 1.0) currentPrincipal = 0;
    if (finalOutstandingInterest < 1.0) finalOutstandingInterest = 0;
  }

  const amountDue = currentPrincipal + finalOutstandingInterest;

  return {
    totalInterestOwed: Math.round(totalInterestPaid + finalOutstandingInterest),
    principalPaid: Math.round(totalPrincipalPaid),
    interestPaid: Math.round(totalInterestPaid),
    totalPaid: Math.round(totalPrincipalPaid + totalInterestPaid + totalDiscount),
    outstandingPrincipal: Math.round(currentPrincipal),
    outstandingInterest: Math.round(finalOutstandingInterest),
    amountDue: Math.round(amountDue),
    breakdown: breakdown.reverse()
  };
};

module.exports = {
  calculateGoldLoanMonths,
  getScopedLoanQuery,
  calculateLoanFinancials
};