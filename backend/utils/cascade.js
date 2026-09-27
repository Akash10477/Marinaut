const Vessel = require("../models/Vessel");
const Fine = require("../models/Fine");
const Payment = require("../models/Payment");

// Deletes vessel(s) + all their fines + all payments. Deletes in reverse order (payment -> fine -> vessel)
// so an error midway never leaves "orphan" records (a fine without its vessel).
const purgeVessels = async (vesselIds) => {
  const fineIds = await Fine.find({ vessel: { $in: vesselIds } }).distinct("_id");
  const payments = await Payment.deleteMany({ fine: { $in: fineIds } });
  const fines = await Fine.deleteMany({ _id: { $in: fineIds } });
  const vessels = await Vessel.deleteMany({ _id: { $in: vesselIds } });
  return { vessels: vessels.deletedCount, fines: fines.deletedCount, payments: payments.deletedCount };
};

// Counts what a delete would remove (shown in the confirm dialog)
const countForVessels = async (vesselIds) => {
  const fineIds = await Fine.find({ vessel: { $in: vesselIds } }).distinct("_id");
  const payments = await Payment.countDocuments({ fine: { $in: fineIds } });
  return { vessels: vesselIds.length, fines: fineIds.length, payments };
};

module.exports = { purgeVessels, countForVessels };
