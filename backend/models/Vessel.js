const mongoose = require("mongoose");

const VESSEL_TYPES = ["Launch", "Cargo Ship", "Passenger Vessel", "Boat", "Tanker", "Other"];

// The capacity unit is locked by vessel type. For "Other" the owner chooses.
const CAPACITY_UNITS = ["passengers", "tons"];
const UNIT_BY_TYPE = {
  Launch: "passengers",
  "Passenger Vessel": "passengers",
  Boat: "passengers",
  "Cargo Ship": "tons",
  Tanker: "tons"
};

const vesselSchema = new mongoose.Schema(
  {
    vesselName: {
      type: String,
      required: [true, "Vessel name is required"],
      trim: true
    },
    registrationNumber: {
      type: String,
      required: [true, "Registration number is required"],
      unique: true,
      trim: true,
      uppercase: true,
      // Format: one letter, a dash, then any number of digits -> M-15245, B-7, K-1234567
      match: [/^[A-Z]-\d+$/, "Registration number must be like M-15245 (one letter, a dash, then digits)"]
    },
    vesselType: {
      type: String,
      required: [true, "Vessel type is required"],
      enum: {
        values: VESSEL_TYPES,
        message: "`{VALUE}` is not a valid vessel type"
      }
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    route: {
      type: String,
      trim: true
    },
    capacity: {
      type: Number,
      min: [0, "Capacity cannot be negative"]
    },
    capacityUnit: {
      type: String,
      enum: {
        values: CAPACITY_UNITS,
        message: "Capacity unit must be passengers or tons"
      },
      default: "passengers"
    },
    status: {
      type: String,
      enum: ["Active", "Suspended"],
      default: "Active"
    }
  },
  { timestamps: true }
);

// Before saving, set the unit from the type (for every type except Other, whatever the client sent)
vesselSchema.pre("validate", function () {
  if (UNIT_BY_TYPE[this.vesselType]) this.capacityUnit = UNIT_BY_TYPE[this.vesselType];
});

vesselSchema.statics.VESSEL_TYPES = VESSEL_TYPES;
vesselSchema.statics.UNIT_BY_TYPE = UNIT_BY_TYPE;

module.exports = mongoose.model("Vessel", vesselSchema);
