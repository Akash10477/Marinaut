const crypto = require("crypto");
const Payment = require("../models/Payment");
const Fine = require("../models/Fine");
const Vessel = require("../models/Vessel");
const AppError = require("../utils/AppError");
const { getPagination, paginated } = require("../utils/pagination");
const { findAccessibleFine } = require("./fineController");
const { logAudit } = require("../utils/audit");

// @route POST /api/payments/fine/:fineId   body: { method: "bKash" }
// Owners pay their own fines; an admin can record a "Cash" payment at the office
// NOTE: this is a mock payment — a real gateway (bKash/SSLCommerz sandbox) plugs in here later
exports.payFine = async (req, res) => {
  if (req.user.role === "police") {
    throw new AppError(403, "Naval Police cannot record payments");
  }

  const { method } = req.body;
  if (!Payment.METHODS.includes(method)) {
    return res.status(400).json({ message: `method must be one of: ${Payment.METHODS.join(", ")}` });
  }
  if (method === "Cash" && req.user.role !== "admin") {
    return res.status(400).json({ message: "Cash payments can only be recorded by admin" });
  }

  const fine = await findAccessibleFine(req.params.fineId, req.user);
  if (fine.status !== "Unpaid") {
    return res.status(400).json({ message: `This fine is already ${fine.status.toLowerCase()}` });
  }

  const lateFee = fine.lateFee; // 5% / 10% every 30 days (utils/lateFee.js)
  const transactionId = `TXN${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

  // Payment.fine is unique, so a fine can never be paid twice (even on double-click)
  const payment = await Payment.create({
    fine: fine._id,
    paidBy: req.user.id,
    fineAmount: fine.amount,
    lateFee,
    totalAmount: fine.amount + lateFee,
    method,
    transactionId
  });

  // only mark Paid if it is still Unpaid (prevents a race condition)
  const updated = await Fine.findOneAndUpdate(
    { _id: fine._id, status: "Unpaid" },
    { status: "Paid", paidAt: payment.paidAt, payment: payment._id },
    { returnDocument: "after" }
  );
  if (!updated) {
    await payment.deleteOne();
    throw new AppError(409, "Fine status changed during payment, please retry");
  }

  await logAudit(req, {
    action: "PAYMENT_RECORDED", entityType: "payment", entityId: payment._id, entityLabel: payment.transactionId,
    details: {
      fineNumber: fine.fineNumber, vessel: fine.vessel.registrationNumber,
      method, fineAmount: fine.amount, lateFee, totalAmount: payment.totalAmount
    }
  });
  return res.status(201).json({ message: "Payment successful", payment, fine: updated });
};

// @route GET /api/payments  (owner: own, admin/police: all)
exports.getPayments = async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};

  if (req.user.role === "owner") {
    const vesselIds = await Vessel.find({ owner: req.user.id }).distinct("_id");
    const fineIds = await Fine.find({ vessel: { $in: vesselIds } }).distinct("_id");
    filter.fine = { $in: fineIds };
  }

  const [items, total] = await Promise.all([
    Payment.find(filter)
      .populate({
        path: "fine",
        select: "fineNumber violationTitle vessel",
        populate: { path: "vessel", select: "vesselName registrationNumber" }
      })
      .populate("paidBy", "name")
      .sort({ paidAt: -1 })
      .skip(skip)
      .limit(limit),
    Payment.countDocuments(filter)
  ]);

  return res.json(paginated(items, total, page, limit));
};

// @route GET /api/payments/:id  -> receipt
exports.getPaymentById = async (req, res) => {
  const payment = await Payment.findById(req.params.id)
    .populate({
      path: "fine",
      populate: [
        { path: "vessel", select: "vesselName registrationNumber vesselType owner" },
        { path: "issuedBy", select: "name badgeNumber" }
      ]
    })
    .populate("paidBy", "name email");

  if (!payment) return res.status(404).json({ message: "Payment not found" });
  if (req.user.role === "owner" && payment.fine.vessel.owner.toString() !== req.user.id) {
    return res.status(403).json({ message: "You can only view your own receipts" });
  }

  return res.json({ payment });
};
