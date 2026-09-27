const express = require("express");
const router = express.Router();
const { getAuditLogs } = require("../controllers/auditController");
const { protect, authorize } = require("../middleware/authMiddleware");

// Read-only — there are no edit/delete routes (append-only)
router.get("/", protect, authorize("admin"), getAuditLogs);

module.exports = router;
