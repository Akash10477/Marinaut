const Vessel = require("../models/Vessel");
const Fine = require("../models/Fine");
const Payment = require("../models/Payment");

// @route GET /api/public/fines/:registrationNumber  (no login)
// Like the road "e-case search": check unpaid fines by registration number
// The owner's personal info (email/phone) is never shown
exports.lookupFines = async (req, res) => {
  const regNo = String(req.params.registrationNumber).trim().toUpperCase();

  const vessel = await Vessel.findOne({ registrationNumber: regNo });
  if (!vessel) {
    return res.status(404).json({ message: "No vessel found with this registration number" });
  }

  const fines = await Fine.find({ vessel: vessel._id, status: "Unpaid" }).sort({ issuedAt: -1 });

  const items = fines.map((f) => {
    const { lateFee, ratePercent, periods } = f.lateFeeInfo;
    return {
      fineNumber: f.fineNumber,
      violation: f.violationTitle,
      location: f.location,
      issuedAt: f.issuedAt,
      dueDate: f.dueDate,
      amount: f.amount,
      lateFee,
      lateFeeRate: ratePercent,
      lateFeePeriods: periods,
      payable: f.amount + lateFee,
      isOverdue: f.isOverdue,
      isRepeatOffence: f.isRepeatOffence
    };
  });

  return res.json({
    vessel: {
      vesselName: vessel.vesselName,
      registrationNumber: vessel.registrationNumber,
      vesselType: vessel.vesselType,
      capacity: vessel.capacity,
      capacityUnit: Vessel.UNIT_BY_TYPE[vessel.vesselType] || vessel.capacityUnit,
      status: vessel.status
    },
    unpaidCount: items.length,
    totalPayable: items.reduce((sum, f) => sum + f.payable, 0),
    fines: items
  });
};

// @route GET /api/public/verify/:transactionId  (no login)
// Scanning a receipt's QR code uses this API to check whether the receipt is genuine.
// The owner's personal info (email/phone) is never shown.
exports.verifyReceipt = async (req, res) => {
  const transactionId = String(req.params.transactionId).trim().toUpperCase();

  const payment = await Payment.findOne({ transactionId }).populate({
    path: "fine",
    select: "fineNumber violationTitle location issuedAt vessel status",
    populate: { path: "vessel", select: "vesselName registrationNumber vesselType" }
  });

  if (!payment || !payment.fine) {
    return res.status(404).json({ valid: false, message: "No receipt found with this transaction ID" });
  }

  const { fine } = payment;
  return res.json({
    valid: true,
    receipt: {
      transactionId: payment.transactionId,
      paidAt: payment.paidAt,
      method: payment.method,
      fineAmount: payment.fineAmount,
      lateFee: payment.lateFee,
      totalAmount: payment.totalAmount,
      fineNumber: fine.fineNumber,
      violation: fine.violationTitle,
      location: fine.location,
      issuedAt: fine.issuedAt,
      fineStatus: fine.status,
      vesselName: fine.vessel?.vesselName,
      registrationNumber: fine.vessel?.registrationNumber,
      vesselType: fine.vessel?.vesselType
    }
  });
};

// @route GET /api/public/stats  (no login) -> numbers for the homepage
// Totals only — no personal information
exports.getStats = async (req, res) => {
  const [vessels, finesIssued, finesPaid, collectedRows] = await Promise.all([
    Vessel.countDocuments(),
    Fine.countDocuments({ status: { $ne: "Cancelled" } }),
    Fine.countDocuments({ status: "Paid" }),
    Payment.aggregate([{ $group: { _id: null, total: { $sum: "$totalAmount" } } }])
  ]);

  return res.json({
    vessels,
    finesIssued,
    finesPaid,
    collected: collectedRows[0] ? collectedRows[0].total : 0,
    paidRate: finesIssued ? Math.round((finesPaid / finesIssued) * 100) : 0
  });
};
