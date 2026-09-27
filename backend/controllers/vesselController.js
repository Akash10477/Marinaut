const Vessel = require("../models/Vessel");
const User = require("../models/User");
const Fine = require("../models/Fine");
const AppError = require("../utils/AppError");
const { getPagination, paginated, escapeRegex } = require("../utils/pagination");
const { purgeVessels, countForVessels } = require("../utils/cascade");
const { logAudit, diff } = require("../utils/audit");

const isStaff = (user) => ["admin", "police"].includes(user.role);

// Load a vessel; owners may only access their own
const findAccessibleVessel = async (id, user) => {
  const vessel = await Vessel.findById(id).populate("owner", "name email phone");
  if (!vessel) throw new AppError(404, "Vessel not found");
  if (!isStaff(user) && vessel.owner._id.toString() !== user.id) {
    throw new AppError(403, "You can only access your own vessels");
  }
  return vessel;
};

// @route POST /api/vessels   (owner: for themselves | admin/police: for another owner via ownerEmail)
exports.addVessel = async (req, res) => {
  const { vesselName, registrationNumber, vesselType, route, capacity, capacityUnit, ownerEmail } = req.body;

  if (!vesselName || !registrationNumber || !vesselType) {
    return res.status(400).json({
      message: "vesselName, registrationNumber and vesselType are required"
    });
  }

  let ownerId = req.user.id;
  if (isStaff(req.user)) {
    if (!ownerEmail) {
      return res.status(400).json({ message: "ownerEmail is required when staff registers a vessel" });
    }
    const owner = await User.findOne({ email: String(ownerEmail).toLowerCase().trim(), role: "owner" });
    if (!owner) return res.status(404).json({ message: "No owner account found with this email" });
    ownerId = owner._id;
  }

  // the schema saves it in uppercase, so check in uppercase too
  const regNo = String(registrationNumber).trim().toUpperCase();
  if (await Vessel.findOne({ registrationNumber: regNo })) {
    return res.status(409).json({ message: "A vessel with this registration number already exists" });
  }

  const vessel = await Vessel.create({
    vesselName,
    registrationNumber: regNo,
    vesselType,
    owner: ownerId,
    route,
    capacity,
    capacityUnit // only used for type "Other"; the model sets it for every other type
  });

  await logAudit(req, {
    action: "VESSEL_CREATED", entityType: "vessel", entityId: vessel._id, entityLabel: vessel.registrationNumber,
    details: { vesselName: vessel.vesselName, vesselType: vessel.vesselType, ownerEmail: ownerEmail || req.user.email }
  });
  return res.status(201).json({ message: "Vessel added successfully", vessel });
};

// @route GET /api/vessels?search=&status=&vesselType=&page=
// owners get only their own, admin/police get all
exports.getVessels = async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};

  if (!isStaff(req.user)) filter.owner = req.user.id;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.vesselType) filter.vesselType = req.query.vesselType;
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), "i");
    filter.$or = [{ vesselName: rx }, { registrationNumber: rx }];
  }

  const [items, total] = await Promise.all([
    Vessel.find(filter).populate("owner", "name email").sort({ createdAt: -1 }).skip(skip).limit(limit),
    Vessel.countDocuments(filter)
  ]);

  return res.json(paginated(items, total, page, limit));
};

// @route GET /api/vessels/:id  -> vessel + fine summary
exports.getVesselById = async (req, res) => {
  const vessel = await findAccessibleVessel(req.params.id, req.user);

  const fines = await Fine.find({ vessel: vessel._id }).sort({ issuedAt: -1 });
  const unpaid = fines.filter((f) => f.status === "Unpaid");

  return res.json({
    vessel,
    fineSummary: {
      total: fines.length,
      unpaid: unpaid.length,
      overdue: unpaid.filter((f) => f.isOverdue).length,
      totalDue: unpaid.reduce((sum, f) => sum + f.totalPayable, 0) // including late fees
    },
    fines
  });
};

// @route PATCH /api/vessels/:id  (owner: own vessel, admin: any)
// registrationNumber and owner cannot be changed here
exports.updateVessel = async (req, res) => {
  if (req.user.role === "police") {
    return res.status(403).json({ message: "Naval Police cannot edit vessel details" });
  }
  const vessel = await findAccessibleVessel(req.params.id, req.user);

  const allowed = ["vesselName", "vesselType", "route", "capacity", "capacityUnit"];
  const before = vessel.toObject();
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) vessel[field] = req.body[field];
  });

  await vessel.save();
  const changes = diff(before, vessel.toObject(), allowed);
  if (Object.keys(changes).length) {
    await logAudit(req, {
      action: "VESSEL_UPDATED", entityType: "vessel", entityId: vessel._id, entityLabel: vessel.registrationNumber, details: changes
    });
  }
  return res.json({ message: "Vessel updated successfully", vessel });
};

// @route PATCH /api/vessels/:id/status  (admin) body: { status: "Suspended" }
exports.setVesselStatus = async (req, res) => {
  const { status } = req.body;
  if (!["Active", "Suspended"].includes(status)) {
    return res.status(400).json({ message: "Status must be Active or Suspended" });
  }

  const vessel = await Vessel.findByIdAndUpdate(req.params.id, { status }, { returnDocument: "after", runValidators: true });
  if (!vessel) return res.status(404).json({ message: "Vessel not found" });

  await logAudit(req, {
    action: status === "Active" ? "VESSEL_ACTIVATED" : "VESSEL_SUSPENDED", entityType: "vessel",
    entityId: vessel._id, entityLabel: vessel.registrationNumber, details: { vesselName: vessel.vesselName }
  });
  return res.json({ message: `Vessel ${status === "Active" ? "activated" : "suspended"}`, vessel });
};

// @route DELETE /api/vessels/:id  (admin)
// No fines: delete directly.
// Has fines: ?force=true&confirm=<registration number> permanently deletes the vessel + all its fines and payments
exports.deleteVessel = async (req, res) => {
  const vessel = await Vessel.findById(req.params.id);
  if (!vessel) return res.status(404).json({ message: "Vessel not found" });

  const linked = await countForVessels([vessel._id]);

  if (linked.fines > 0) {
    if (req.query.force !== "true") {
      return res.status(400).json({
        message: `This vessel has ${linked.fines} fine(s) and ${linked.payments} payment(s).`,
        canForce: true,
        confirmWith: vessel.registrationNumber,
        linked
      });
    }
    if (String(req.query.confirm || "").trim().toUpperCase() !== vessel.registrationNumber) {
      return res.status(400).json({ message: `Type the registration number ${vessel.registrationNumber} to confirm` });
    }
  }

  const removed = await purgeVessels([vessel._id]);
  await logAudit(req, {
    action: "VESSEL_REMOVED", entityType: "vessel", entityId: vessel._id, entityLabel: vessel.registrationNumber,
    details: { vesselName: vessel.vesselName, forced: linked.fines > 0, fines: removed.fines, payments: removed.payments }
  });
  return res.json({
    message: `${vessel.vesselName} removed with ${removed.fines} fine(s) and ${removed.payments} payment(s)`,
    removed
  });
};
