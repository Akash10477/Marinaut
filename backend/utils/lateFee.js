const config = require("./config");

const DAY = 24 * 60 * 60 * 1000;

/*
 * Late fee calculation (simple interest, not compound):
 *   - Paid by the due date: late fee is 0
 *   - Right after the due date the 1st period starts -> 5% of the base amount (10% for repeat offences)
 *   - Then another 5% (10% for repeat) is added every 30 days
 *
 * Example: ৳10,000 fine, 45 days past due -> 2 periods -> 2 × 5% = ৳1,000 late fee
 */
const calcLateFee = (fine, now = new Date()) => {
  const ratePercent = fine.isRepeatOffence ? config.REPEAT_LATE_FEE_PERCENT : config.LATE_FEE_PERCENT;
  const base = { lateFee: 0, periods: 0, ratePercent, daysOverdue: 0, nextIncreaseAt: null };

  if (fine.status !== "Unpaid" || !fine.dueDate || new Date(fine.dueDate) >= now) return base;

  const msLate = now - new Date(fine.dueDate);
  const intervalMs = config.LATE_FEE_INTERVAL_DAYS * DAY;
  const periods = Math.floor(msLate / intervalMs) + 1;

  return {
    lateFee: Math.round((fine.amount * ratePercent * periods) / 100),
    periods,
    ratePercent,
    daysOverdue: Math.floor(msLate / DAY),
    nextIncreaseAt: new Date(new Date(fine.dueDate).getTime() + periods * intervalMs)
  };
};

module.exports = { calcLateFee };
