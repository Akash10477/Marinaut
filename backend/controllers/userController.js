const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Vessel = require("../models/Vessel");
const Fine = require("../models/Fine");
const Payment = require("../models/Payment");
const { getPagination, paginated, escapeRegex } = require("../utils/pagination");
const { publicUser } = require("./authController");
const { purgeVessels, countForVessels } = require("../utils/cascade");
const { logAudit } = require("../utils/audit");

// @route GET /api/users?role=police&search=rahim  (admin)
exports.getUsers = async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};

  if (req.query.role) filter.role = req.query.role;
  if (req.query.approvalStatus) filter.approvalStatus = req.query.approvalStatus;
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), "i");
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }, { badgeNumber: rx }];
  }

  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter)
  ]);

  return res.json(paginated(items, total, page, limit));
};

// @route POST /api/users  (admin) -> create a police / admin / owner account
exports.createUser = async (req, res) => {
  const { name, email, password, phone, role = "police", badgeNumber } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email and password are required" });
  }
  if (!User.ROLES.includes(role)) {
    return res.status(400).json({ message: `Role must be one of: ${User.ROLES.join(", ")}` });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  if (await User.findOne({ email: normalizedEmail })) {
    return res.status(409).json({ message: "User already exists" });
  }

  const user = await User.create({
    name,
    email: normalizedEmail,
    phone,
    role,
    badgeNumber,
    approvalStatus: "approved", // accounts created by an admin need no approval
    password: await bcrypt.hash(String(password), 10)
  });

  await logAudit(req, {
    action: "USER_CREATED", entityType: "user", entityId: user._id, entityLabel: user.email,
    details: { name: user.name, role: user.role, badgeNumber: user.badgeNumber }
  });
  return res.status(201).json({ message: `${role} created successfully`, user: publicUser(user) });
};

// @route PATCH /api/users/:id/status  (admin) body: { isActive: false }
exports.setUserStatus = async (req, res) => {
  if (typeof req.body.isActive !== "boolean") {
    return res.status(400).json({ message: "isActive (true/false) is required" });
  }
  if (req.params.id === req.user.id) {
    return res.status(400).json({ message: "You cannot change your own status" });
  }

  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.isActive = req.body.isActive;
  await user.save();
  await logAudit(req, {
    action: user.isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED", entityType: "user", entityId: user._id,
    entityLabel: user.email, details: { name: user.name, role: user.role }
  });

  return res.json({ message: `User ${user.isActive ? "activated" : "deactivated"}`, user });
};

// @route PATCH /api/users/:id/approval  (admin) body: { status: "approved" | "rejected" }
// Naval Police registration approve / reject
exports.setApproval = async (req, res) => {
  const { status } = req.body;
  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ message: "status must be approved or rejected" });
  }

  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  if (user.role !== "police") {
    return res.status(400).json({ message: "Only Naval Police registrations need approval" });
  }

  user.approvalStatus = status;
  await user.save();
  await logAudit(req, {
    action: status === "approved" ? "USER_APPROVED" : "USER_REJECTED", entityType: "user", entityId: user._id,
    entityLabel: user.email, details: { name: user.name, badgeNumber: user.badgeNumber }
  });

  return res.json({ message: `Registration ${status}`, user });
};

// @route DELETE /api/users/:id  (admin) -> remove a user
// - No linked records: delete directly
// - Vessel Owner with vessels/fines: ?force=true&confirm=<owner email>
//   permanently deletes the owner + all their vessels, fines and payments
// - Naval Police / Admins who issued fines or recorded cash payments cannot be force-deleted
//   (other owners' fine records would break) -> Deactivate instead
exports.deleteUser = async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ message: "You cannot remove your own account" });
  }

  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  if (user.role === "admin" && (await User.countDocuments({ role: "admin" })) <= 1) {
    return res.status(400).json({ message: "Cannot remove the last admin" });
  }

  // ---------- Vessel Owner ----------
  if (user.role === "owner") {
    const vesselIds = await Vessel.find({ owner: user._id }).distinct("_id");
    const linked = await countForVessels(vesselIds);
    const hasRecords = linked.vessels > 0;

    if (hasRecords) {
      if (req.query.force !== "true") {
        return res.status(400).json({
          message: `${user.name} owns ${linked.vessels} vessel(s) with ${linked.fines} fine(s) and ${linked.payments} payment(s).`,
          canForce: true,
          confirmWith: user.email,
          linked
        });
      }
      if (String(req.query.confirm || "").trim().toLowerCase() !== user.email) {
        return res.status(400).json({ message: `Type the email ${user.email} to confirm` });
      }
    }

    const removed = hasRecords ? await purgeVessels(vesselIds) : { vessels: 0, fines: 0, payments: 0 };
    await user.deleteOne();
    await logAudit(req, {
      action: "USER_REMOVED", entityType: "user", entityId: user._id, entityLabel: user.email,
      details: { name: user.name, role: user.role, forced: hasRecords, ...removed }
    });
    return res.json({
      message: hasRecords
        ? `${user.name} removed with ${removed.vessels} vessel(s), ${removed.fines} fine(s) and ${removed.payments} payment(s)`
        : `${user.name} removed`,
      removed
    });
  }

  // ---------- Naval Police / Admin ----------
  const [finesIssued, payments] = await Promise.all([
    Fine.countDocuments({ issuedBy: user._id }),
    Payment.countDocuments({ paidBy: user._id })
  ]);
  const linked = [finesIssued && `${finesIssued} issued fine(s)`, payments && `${payments} recorded payment(s)`].filter(Boolean);

  if (linked.length) {
    return res.status(400).json({
      message: `Cannot remove ${user.name}: linked to ${linked.join(", ")}. Deactivate the account instead.`
    });
  }

  await user.deleteOne();
  await logAudit(req, {
    action: "USER_REMOVED", entityType: "user", entityId: user._id, entityLabel: user.email,
    details: { name: user.name, role: user.role }
  });
  return res.json({ message: `${user.name} removed` });
};
