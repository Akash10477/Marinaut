const mongoose = require("mongoose");

// Who did what, and when — entries are only added, never edited or deleted (append-only)
// actor/entity names are copied so the log stays readable even after a user or vessel is deleted
const ACTIONS = [
  // auth
  "LOGIN_SUCCESS", "LOGIN_FAILED", "USER_REGISTERED", "ADMIN_KEY_REJECTED",
  // users
  "USER_CREATED", "USER_APPROVED", "USER_REJECTED", "USER_ACTIVATED", "USER_DEACTIVATED", "USER_REMOVED",
  // vessels
  "VESSEL_CREATED", "VESSEL_UPDATED", "VESSEL_SUSPENDED", "VESSEL_ACTIVATED", "VESSEL_REMOVED",
  // violations
  "VIOLATION_CREATED", "VIOLATION_UPDATED", "VIOLATION_DEACTIVATED",
  // fines & payments
  "FINE_ISSUED", "FINE_CANCELLED", "PAYMENT_RECORDED"
];

const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    actorName: String,
    actorRole: String,
    action: { type: String, enum: ACTIONS, required: true },
    entityType: { type: String, enum: ["auth", "user", "vessel", "violation", "fine", "payment"], required: true },
    entityId: mongoose.Schema.Types.ObjectId,
    entityLabel: String, // e.g. "M-15245", "MRN-2026-000012", "karim@marinaut.com"
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: String
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entityType: 1, createdAt: -1 });

auditLogSchema.statics.ACTIONS = ACTIONS;

module.exports = mongoose.model("AuditLog", auditLogSchema);
