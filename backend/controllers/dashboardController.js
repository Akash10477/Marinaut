const Fine = require("../models/Fine");
const Vessel = require("../models/Vessel");
const Payment = require("../models/Payment");
const User = require("../models/User");

// count + amount per status: { Unpaid: {count, amount}, Paid: {...}, Cancelled: {...} }
const fineStatusSummary = async (match) => {
  const rows = await Fine.aggregate([
    { $match: match },
    { $group: { _id: "$status", count: { $sum: 1 }, amount: { $sum: "$amount" } } }
  ]);
  const summary = { Unpaid: { count: 0, amount: 0 }, Paid: { count: 0, amount: 0 }, Cancelled: { count: 0, amount: 0 } };
  rows.forEach((r) => { summary[r._id] = { count: r.count, amount: r.amount }; });
  return summary;
};

const recentFines = (match) =>
  Fine.find(match)
    .populate("vessel", "vesselName registrationNumber")
    .sort({ issuedAt: -1 })
    .limit(5);

// Total payable of unpaid fines (base + late fees accrued so far)
// Late fees change every day, so they are calculated here instead of stored
const outstanding = async (match) => {
  const unpaid = await Fine.find({ ...match, status: "Unpaid" }).select("amount dueDate status isRepeatOffence");
  return unpaid.reduce(
    (acc, f) => ({ base: acc.base + f.amount, lateFees: acc.lateFees + f.lateFee, total: acc.total + f.totalPayable }),
    { base: 0, lateFees: 0, total: 0 }
  );
};

// Collection for the last 6 months (for the chart)
const monthlyCollection = (payments) => {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleString("en-US", { month: "short" }),
      amount: 0
    });
  }
  payments.forEach((p) => {
    const d = new Date(p.paidAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const m = months.find((x) => x.key === key);
    if (m) m.amount += p.totalAmount;
  });
  return months;
};

// @route GET /api/dashboard  -> different data per role
exports.getDashboard = async (req, res) => {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  // ---------------- OWNER ----------------
  if (req.user.role === "owner") {
    const vessels = await Vessel.find({ owner: req.user.id }).select("_id");
    const vesselIds = vessels.map((v) => v._id);
    const match = { vessel: { $in: vesselIds } };

    const [fines, overdue, recent, due] = await Promise.all([
      fineStatusSummary(match),
      Fine.countDocuments({ ...match, status: "Unpaid", dueDate: { $lt: now } }),
      recentFines(match),
      outstanding(match)
    ]);

    return res.json({
      role: "owner",
      vessels: { total: vesselIds.length },
      fines,
      overdue,
      totalDue: due.total,
      lateFeesAccrued: due.lateFees,
      totalPaid: fines.Paid.amount,
      recentFines: recent
    });
  }

  // ---------------- ADMIN / NAVAL POLICE ----------------
  const [vesselTotal, vesselSuspended, fines, overdue, collectedRows, byViolation, recent, payments, due] =
    await Promise.all([
      Vessel.countDocuments(),
      Vessel.countDocuments({ status: "Suspended" }),
      fineStatusSummary({}),
      Fine.countDocuments({ status: "Unpaid", dueDate: { $lt: now } }),
      Payment.aggregate([{ $group: { _id: null, total: { $sum: "$totalAmount" } } }]),
      Fine.aggregate([
        { $match: { status: { $ne: "Cancelled" } } },
        { $group: { _id: "$violationTitle", count: { $sum: 1 }, amount: { $sum: "$amount" } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),
      recentFines({}),
      Payment.find({ paidAt: { $gte: sixMonthsAgo } }).select("paidAt totalAmount"),
      outstanding({})
    ]);

  const data = {
    role: req.user.role,
    vessels: { total: vesselTotal, active: vesselTotal - vesselSuspended, suspended: vesselSuspended },
    fines,
    overdue,
    totalCollected: collectedRows[0] ? collectedRows[0].total : 0,
    totalOutstanding: due.total,
    lateFeesAccrued: due.lateFees,
    topViolations: byViolation.map((v) => ({ title: v._id, count: v.count, amount: v.amount })),
    monthlyCollection: monthlyCollection(payments),
    recentFines: recent
  };

  if (req.user.role === "admin") {
    const roleRows = await User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]);
    data.users = { admin: 0, police: 0, owner: 0 };
    roleRows.forEach((r) => { data.users[r._id] = r.count; });
    data.pendingApprovals = await User.countDocuments({ role: "police", approvalStatus: "pending" });
  }

  return res.json(data);
};
