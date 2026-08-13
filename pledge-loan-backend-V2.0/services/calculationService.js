/**
 * Calculates interest and precisely tracks remaining weight balances 
 * by isolating gold and silver to prevent database transaction mismatches.
 */
const calculateLoanSummary = (principal, rate, loanDate, pledgedItems, currentDate = new Date()) => {
  // 1. Interest Calculation
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysElapsed = Math.floor((currentDate - new Date(loanDate)) / msPerDay);
  const dailyRate = (rate / 100) / 30; 
  const interestAmount = principal * dailyRate * daysElapsed;

  // 2. Weight Balance Isolation
  let pendingGoldWeight = 0;
  let pendingSilverWeight = 0;

  pledgedItems.forEach(item => {
    if (!item.is_redeemed) {
      if (item.metal_type.toLowerCase() === 'gold') {
        pendingGoldWeight += parseFloat(item.net_weight_grams);
      } else if (item.metal_type.toLowerCase() === 'silver') {
        pendingSilverWeight += parseFloat(item.net_weight_grams);
      }
    }
  });

  return {
    financials: {
      principal: parseFloat(principal),
      daysElapsed,
      interestAmount: parseFloat(interestAmount.toFixed(2)),
      totalDue: parseFloat((principal + interestAmount).toFixed(2))
    },
    balances: {
      pendingGoldWeight: parseFloat(pendingGoldWeight.toFixed(3)),
      pendingSilverWeight: parseFloat(pendingSilverWeight.toFixed(3))
    }
  };
};

module.exports = {
  calculateLoanSummary
};