const AuditLog = require("../models/AuditLog");
const { getPagination, paginated, escapeRegex } = require("../utils/pagination");

// @route GET /api/audit-logs?entityType=&action=&search=&from=&to=&page=  (admin)
exports.getAuditLogs = async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, 20);
  const filter = {};

  if (req.query.entityType) filter.entityType = req.query.entityType;
  if (req.query.action) filter.action = req.query.action;
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), "i");
    filter.$or = [{ actorName: rx }, { entityLabel: rx }, { action: rx }];
  }
  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) {
      const to = new Date(req.query.to);
      to.setHours(23, 59, 59, 999); // include the whole end day
      filter.createdAt.$lte = to;
    }
  }

  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    AuditLog.countDocuments(filter)
  ]);

  return res.json(paginated(items, total, page, limit));
};
