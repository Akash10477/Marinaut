const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Verifies the token, loads the user from the DB and sets req.user
// (checking the DB means deactivation or role changes take effect immediately)
const protect = async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.split(" ")[1] : null;

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ message: "Not authorized, token invalid or expired" });
  }

  const user = await User.findById(decoded.id).select("name email role isActive approvalStatus");
  if (!user || !user.isActive || user.approvalStatus !== "approved") {
    return res.status(401).json({ message: "Not authorized, account not found or disabled" });
  }

  req.user = { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
  return next();
};

// Role guard: authorize("admin"), authorize("admin", "police")
const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: "Forbidden: insufficient role" });
  }
  return next();
};

module.exports = { protect, authorize };
