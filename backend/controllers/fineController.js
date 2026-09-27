const mongoose = require("mongoose");
const Fine = require("../models/Fine");
const Vessel = require("../models/Vessel");
const Violation = require("../models/Violation");
const Counter = require("../models/Counter");
const AppError = require("../utils/AppError");
const config = require("../utils/config");
const { logAudit } = require("../utils/audit");
const { getPagination, paginated, escapeRegex } = require("../utils/pagination");

const DAY = 24 * 60 * 60 * 1000;
const isStaff = (user) => ["admin", "police"].includes(user.role);

const populateFine = (query) =>
  query
    .populate("vessel", "vesselName registrationNumber vesselType owner status")
    .populate("violation", "code title severity")
    .populate("issuedBy", "name badgeNumber")
    .populate("payment");

// Load a fine; owners may only access fines of their own vessels
const findAccessibleFine = async (id, user) => {
  const fine = await populateFine(Fine.findById(id));
  if (!fine) throw new AppError(404, "Fine not found");
  if (!isStaff(user) && fine.vessel.owner.toString() !== user.id) {
    throw new AppError(403, "You can only access fines of your own vessels");
  }
  return fine;
};

// @route POST /api/fines  (police/admin)
// body: { registrationNumber | vesselId, violationId, location, notes }
exports.issueFine = async (req, res) => {
  const { registrationNumber, vesselId, violationId, location, notes } = req.body;

  if ((!registrationNumber && !vesselId) || !violationId || !location) {
    return res.status(400).json({
      message: "registrationNumber (or vesselId), violationId and location are required"
    });
  }

  // 1. find the vessel
  const vessel = vesselId
    ? await Vessel.findById(vesselId)
    : await Vessel.findOne({ registrationNumber: String(registrationNumber).trim().toUpperCase() });
  if (!vessel) return res.status(404).json({ message: "Vessel not found" });

  // 2. find the violation
  if (!mongoose.isValidObjectId(violationId)) {
    return res.status(400).json({ message: "Invalid violationId" });
  }
  const violation = await Violation.findById(violationId);
  if (!violation || !violation.isActive) {
    return res.status(404).json({ message: "Violation not found or inactive" });
  }

  // 3. repeat offence? (same vessel, same offence within the last year)
  const since = new Date(Date.now() - config.REPEAT_WINDOW_DAYS * DAY);
  const isRepeatOffence = Boolean(
    await Fine.exists({
      vessel: vessel._id,
      violation: violation._id,
      status: { $ne: "Cancelled" },
      issuedAt: { $gte: since }
    })
  );
  const amount = isRepeatOffence ? violation.amount * config.REPEAT_OFFENCE_MULTIPLIER : violation.amount;

  // 4. fine number: MRN-2026-000001
  const year = new Date().getFullYear();
  const seq = await Counter.next(`fine-${year}`);
  const fineNumber = `MRN-${year}-${String(seq).padStart(6, "0")}`;

  const fine = await Fine.create({
    fineNumber,
    vessel: vessel._id,
    violation: violation._id,
    violationCode: violation.code,
    violationTitle: violation.title,
    amount,
    isRepeatOffence,
    location,
    notes,
    issuedBy: req.user.id,
    dueDate: new Date(Date.now() + config.FINE_DUE_DAYS * DAY)
  });

  await logAudit(req, {
    action: "FINE_ISSUED", entityType: "fine", entityId: fine._id, entityLabel: fine.fineNumber,
    details: {
      vessel: vessel.registrationNumber, violation: `${violation.code} ${violation.title}`,
      amount, isRepeatOffence, location
    }
  });

  const populated = await populateFine(Fine.findById(fine._id));
  return res.status(201).json({
    message: isRepeatOffence
      ? `Repeat offence! Fine issued at ${config.REPEAT_OFFENCE_MULTIPLIER}x amount`
      : "Fine issued successfully",
    fine: populated
  });
};

// @route GET /api/fines?status=Unpaid|Paid|Cancelled|Overdue&search=DHK&vessel=<id>&page=
// owner -> fines of own vessels, admin/police -> all
exports.getFines = async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};

  // vessel scope
  let vesselIds = null;
  if (!isStaff(req.user)) {
    vesselIds = (await Vessel.find({ owner: req.user.id }).select("_id")).map((v) => v._id.toString());
  }
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), "i");
    const matched = (await Vessel.find({ $or: [{ registrationNumber: rx }, { vesselName: rx }] }).select("_id"))
      .map((v) => v._id.toString());
    vesselIds = vesselIds ? vesselIds.filter((id) => matched.includes(id)) : matched;
  }
  if (req.query.vessel) {
    vesselIds = vesselIds ? vesselIds.filter((id) => id === req.query.vessel) : [req.query.vessel];
  }
  if (vesselIds) filter.vessel = { $in: vesselIds };

  // status
  if (req.query.status === "Overdue") {
    filter.status = "Unpaid";
    filter.dueDate = { $lt: new Date() };
  } else if (req.query.status) {
    filter.status = req.query.status;
  }

  const [items, total] = await Promise.all([
    populateFine(Fine.find(filter)).sort({ issuedAt: -1 }).skip(skip).limit(limit),
    Fine.countDocuments(filter)
  ]);

  return res.json(paginated(items, total, page, limit));
};

// @route GET /api/fines/:id
exports.getFineById = async (req, res) => {
  const fine = await findAccessibleFine(req.params.id, req.user);
  return res.json({ fine, lateFee: fine.lateFee });
};

// @route PATCH /api/fines/:id/cancel  (admin) body: { reason }
exports.cancelFine = async (req, res) => {
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ message: "Cancel reason is required" });

  const fine = await Fine.findById(req.params.id);
  if (!fine) return res.status(404).json({ message: "Fine not found" });
  if (fine.status !== "Unpaid") {
    return res.status(400).json({ message: `Only unpaid fines can be cancelled (current: ${fine.status})` });
  }

  fine.status = "Cancelled";
  fine.cancelReason = reason;
  fine.cancelledBy = req.user.id;
  await fine.save();
  await logAudit(req, {
    action: "FINE_CANCELLED", entityType: "fine", entityId: fine._id, entityLabel: fine.fineNumber,
    details: { amount: fine.amount, reason }
  });

  return res.json({ message: "Fine cancelled", fine });
};

exports.findAccessibleFine = findAccessibleFine;
