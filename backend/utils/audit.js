const AuditLog = require("../models/AuditLog");

// Writes an audit log entry. If logging fails, the real action (fine, payment...) still succeeds.
//   logAudit(req, { action, entityType, entityId, entityLabel, details, actor })
// uses req.user unless an actor is passed (before login there is no req.user, so pass one)
const logAudit = async (req, { action, entityType, entityId, entityLabel, details = {}, actor }) => {
  try {
    const who = actor || req.user || {};
    await AuditLog.create({
      actor: who.id || who._id,
      actorName: who.name || "Anonymous",
      actorRole: who.role || "public",
      action,
      entityType,
      entityId,
      entityLabel,
      details,
      ip: req.ip
    });
  } catch (err) {
    console.error("Audit log failed:", err.message);
  }
};

// Compares before/after values and returns only the fields that changed
// { amount: { from: 5000, to: 6000 } }
const diff = (before, after, fields) =>
  fields.reduce((changes, f) => {
    if (after[f] !== undefined && String(before[f]) !== String(after[f])) {
      changes[f] = { from: before[f] ?? null, to: after[f] };
    }
    return changes;
  }, {});

module.exports = { logAudit, diff };
