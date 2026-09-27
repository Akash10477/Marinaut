const mongoose = require("mongoose");

// 404: no route matched
const notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

// Every error ends up here (Express 5 forwards async errors automatically)
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Mongoose schema validation
  if (err instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({
      message: "Validation failed",
      errors: Object.values(err.errors).map((e) => e.message)
    });
  }

  // Invalid ObjectId, e.g. /api/vessels/abc
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ message: `Invalid ${err.path}: ${err.value}` });
  }

  // Unique index duplicate
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return res.status(409).json({ message: `Duplicate value for ${field}` });
  }

  // Invalid JSON body
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON body" });
  }

  const status = err.status || 500;
  if (status >= 500) console.error("Unhandled error:", err);

  return res.status(status).json({
    message: status >= 500 ? "Server error" : err.message
  });
};

module.exports = { notFound, errorHandler };
