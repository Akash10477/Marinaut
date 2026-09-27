// Business rules in one place so they are easy to change (can be overridden in .env)
const num = (value, fallback) => (value !== undefined && value !== "" && !Number.isNaN(Number(value)) ? Number(value) : fallback);

module.exports = {
  // Days allowed to pay after a fine is issued (payment time limit)
  FINE_DUE_DAYS: num(process.env.FINE_DUE_DAYS, 30),

  // After the due date, % of the base amount added each period
  LATE_FEE_PERCENT: num(process.env.LATE_FEE_PERCENT, 5), // normal fine
  REPEAT_LATE_FEE_PERCENT: num(process.env.REPEAT_LATE_FEE_PERCENT, 10), // repeat offence
  LATE_FEE_INTERVAL_DAYS: num(process.env.LATE_FEE_INTERVAL_DAYS, 30), // length of each period in days

  REPEAT_OFFENCE_MULTIPLIER: 2, // same offence again within 1 year -> 2x fine
  REPEAT_WINDOW_DAYS: 365
};
