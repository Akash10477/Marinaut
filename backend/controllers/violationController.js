const Violation = require("../models/Violation");
const { logAudit, diff } = require("../utils/audit");

// @route GET /api/violations?active=true  (any logged-in user)
exports.getViolations = async (req, res) => {
  const filter = {};
  if (req.query.active === "true") filter.isActive = true;

  const items = await Violation.find(filter).sort({ code: 1 });
  return res.json({ items });
};

// @route POST /api/violations  (admin)
exports.createViolation = async (req, res) => {
  const { code, title, description, amount, severity } = req.body;

  if (!code || !title || amount === undefined) {
    return res.status(400).json({ message: "code, title and amount are required" });
  }

  const violation = await Violation.create({ code, title, description, amount, severity });
  await logAudit(req, {
    action: "VIOLATION_CREATED", entityType: "violation", entityId: violation._id, entityLabel: violation.code,
    details: { title: violation.title, amount: violation.amount, severity: violation.severity }
  });
  return res.status(201).json({ message: "Violation created successfully", violation });
};

// @route PATCH /api/violations/:id  (admin) -> changing the amount does not change existing fines
exports.updateViolation = async (req, res) => {
  const violation = await Violation.findById(req.params.id);
  if (!violation) return res.status(404).json({ message: "Violation not found" });

  const fields = ["title", "description", "amount", "severity", "isActive"];
  const before = violation.toObject();
  fields.forEach((field) => {
    if (req.body[field] !== undefined) violation[field] = req.body[field];
  });

  await violation.save();
  const changes = diff(before, violation.toObject(), fields);
  if (Object.keys(changes).length) {
    await logAudit(req, {
      action: "VIOLATION_UPDATED", entityType: "violation", entityId: violation._id, entityLabel: violation.code, details: changes
    });
  }
  return res.json({ message: "Violation updated successfully", violation });
};

// @route DELETE /api/violations/:id  (admin) -> soft delete (isActive=false), because existing fines reference it
exports.deleteViolation = async (req, res) => {
  const violation = await Violation.findByIdAndUpdate(req.params.id, { isActive: false }, { returnDocument: "after" });
  if (!violation) return res.status(404).json({ message: "Violation not found" });

  await logAudit(req, {
    action: "VIOLATION_DEACTIVATED", entityType: "violation", entityId: violation._id, entityLabel: violation.code,
    details: { title: violation.title }
  });
  return res.json({ message: "Violation deactivated", violation });
};
