const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const generateToken = require("../utils/token");
const { logAudit } = require("../utils/audit");

const PORTAL_NAMES = { owner: "Vessel Owner", police: "Naval Police", admin: "Admin" };

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  badgeNumber: user.badgeNumber,
  approvalStatus: user.approvalStatus
});

// Common validation + duplicate check. Returns an error message if something is wrong.
const validateNewUser = async ({ name, email, password }) => {
  if (!name || !email || !password) return "Name, email and password are required";
  if (String(password).length < 6) return "Password must be at least 6 characters";
  if (await User.findOne({ email: String(email).toLowerCase().trim() })) return "User already exists";
  return null;
};

const createUser = async ({ name, email, password, phone, badgeNumber }, role, approvalStatus) =>
  User.create({
    name: String(name).trim(),
    email: String(email).toLowerCase().trim(),
    phone,
    badgeNumber,
    role,
    approvalStatus,
    password: await bcrypt.hash(String(password), 10)
  });

const sendValidationError = (res, message) =>
  res.status(message === "User already exists" ? 409 : 400).json({ message });

// ======================= REGISTER =======================

// @route POST /api/auth/register  (Vessel Owner portal) -> logged in immediately
exports.registerOwner = async (req, res) => {
  const problem = await validateNewUser(req.body);
  if (problem) return sendValidationError(res, problem);

  // any role in the body is ignored — this portal only creates owners
  const user = await createUser(req.body, "owner", "approved");
  await logAudit(req, {
    action: "USER_REGISTERED", entityType: "user", entityId: user._id, entityLabel: user.email,
    actor: user, details: { portal: "Vessel Owner" }
  });
  return res.status(201).json({
    message: "User registered successfully",
    user: publicUser(user),
    token: generateToken(user)
  });
};

// @route POST /api/auth/police/register  (Naval Police portal)
// Account stays "pending" — cannot log in until an admin approves it
exports.registerPolice = async (req, res) => {
  const problem = await validateNewUser(req.body);
  if (problem) return sendValidationError(res, problem);
  if (!req.body.badgeNumber) {
    return res.status(400).json({ message: "Badge / service number is required" });
  }

  const user = await createUser(req.body, "police", "pending");
  await logAudit(req, {
    action: "USER_REGISTERED", entityType: "user", entityId: user._id, entityLabel: user.email,
    actor: user, details: { portal: "Naval Police", badgeNumber: user.badgeNumber, approval: "pending" }
  });
  return res.status(201).json({
    message: "Registration submitted. You can log in after an admin approves your account.",
    user: publicUser(user)
  });
};

// Compare the secret key in constant time (harder to guess by timing)
const keyMatches = (given, expected) => {
  const a = Buffer.from(String(given || ""));
  const b = Buffer.from(String(expected));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// @route POST /api/auth/admin/register  (Admin portal)
// Only someone who knows ADMIN_REGISTRATION_KEY from .env can become an admin
exports.registerAdmin = async (req, res) => {
  const expected = process.env.ADMIN_REGISTRATION_KEY;
  if (!expected) {
    return res.status(403).json({ message: "Admin registration is disabled on this server" });
  }
  if (!keyMatches(req.body.adminKey, expected)) {
    await logAudit(req, {
      action: "ADMIN_KEY_REJECTED", entityType: "auth", entityLabel: String(req.body.email || "").toLowerCase(),
      actor: { name: req.body.name || "Unknown", role: "public" }
    });
    return res.status(403).json({ message: "Invalid admin registration key" });
  }

  const problem = await validateNewUser(req.body);
  if (problem) return sendValidationError(res, problem);

  const user = await createUser(req.body, "admin", "approved");
  await logAudit(req, {
    action: "USER_REGISTERED", entityType: "user", entityId: user._id, entityLabel: user.email,
    actor: user, details: { portal: "Admin" }
  });
  return res.status(201).json({
    message: "Admin registered successfully",
    user: publicUser(user),
    token: generateToken(user)
  });
};

// ======================= LOGIN =======================

// Each portal only lets accounts of its own role log in
const loginFor = (portalRole) => async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select("+password");

  // same message in both cases (prevents user enumeration)
  if (!user || !(await bcrypt.compare(String(password), user.password))) {
    await logAudit(req, {
      action: "LOGIN_FAILED", entityType: "auth", entityLabel: String(email).toLowerCase().trim(),
      actor: user ? { _id: user._id, name: user.name, role: user.role } : { name: "Unknown", role: "public" },
      details: { portal: PORTAL_NAMES[portalRole], reason: user ? "wrong password" : "unknown email" }
    });
    return res.status(401).json({ message: "Invalid credentials" });
  }
  if (user.role !== portalRole) {
    return res.status(403).json({
      message: `This is not a ${PORTAL_NAMES[portalRole]} account. Please use the ${PORTAL_NAMES[user.role]} portal.`
    });
  }
  if (user.approvalStatus === "pending") {
    return res.status(403).json({ message: "Your account is awaiting admin approval." });
  }
  if (user.approvalStatus === "rejected") {
    return res.status(403).json({ message: "Your registration was rejected. Contact the admin." });
  }
  if (!user.isActive) {
    return res.status(403).json({ message: "Account is disabled. Contact admin." });
  }

  await logAudit(req, {
    action: "LOGIN_SUCCESS", entityType: "auth", entityId: user._id, entityLabel: user.email,
    actor: user, details: { portal: PORTAL_NAMES[portalRole] }
  });
  return res.json({
    message: "Login successful",
    user: publicUser(user),
    token: generateToken(user)
  });
};

exports.loginOwner = loginFor("owner");
exports.loginPolice = loginFor("police");
exports.loginAdmin = loginFor("admin");

// @route GET /api/auth/me  (logged-in)
exports.getMe = async (req, res) => {
  const user = await User.findById(req.user.id);
  return res.json({ user: publicUser(user) });
};

exports.publicUser = publicUser;
