const mongoose = require("mongoose");

// Offence catalog: the fine amount for each offence (set by the admin)
const violationSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Code is required"],
      unique: true,
      trim: true,
      uppercase: true
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    amount: {
      type: Number,
      required: [true, "Fine amount is required"],
      min: [0, "Amount cannot be negative"]
    },
    severity: {
      type: String,
      enum: ["Minor", "Major", "Critical"],
      default: "Minor"
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Violation", violationSchema);
