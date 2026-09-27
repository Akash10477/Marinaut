const express = require("express");
const cors = require("cors");

const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

// Behind a proxy (Render, Heroku...) read the real client IP (used by the audit log)
app.set("trust proxy", 1);

app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "MARINAUT API running" });
});

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/vessels", require("./routes/vesselRoutes"));
app.use("/api/violations", require("./routes/violationRoutes"));
app.use("/api/fines", require("./routes/fineRoutes"));
app.use("/api/payments", require("./routes/paymentRoutes"));
app.use("/api/public", require("./routes/publicRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/audit-logs", require("./routes/auditRoutes"));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
