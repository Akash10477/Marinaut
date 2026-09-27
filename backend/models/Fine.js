const mongoose = require("mongoose");
const { calcLateFee } = require("../utils/lateFee");

const fineSchema = new mongoose.Schema(
  {
    fineNumber: {
      type: String,
      required: true,
      unique: true
    },
    vessel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vessel",
      required: [true, "Vessel is required"]
    },
    violation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Violation",
      required: [true, "Violation is required"]
    },
    // snapshot taken when the fine is issued: later changes to the violation do not affect old fines
    violationCode: String,
    violationTitle: String,

    amount: {
      type: Number,
      required: true,
      min: 0
    },
    isRepeatOffence: {
      type: Boolean,
      default: false
    },
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true
    },
    notes: {
      type: String,
      trim: true
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    issuedAt: {
      type: Date,
      default: Date.now
    },
    dueDate: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ["Unpaid", "Paid", "Cancelled"],
      default: "Unpaid"
    },
    paidAt: Date,
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment"
    },
    cancelReason: String,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Overdue is not stored; it is calculated every time (so it is never stale)
fineSchema.virtual("isOverdue").get(function () {
  return this.status === "Unpaid" && this.dueDate < new Date();
});

// Late fee and total payable are also calculated on the fly -> included in every API response
fineSchema.virtual("lateFeeInfo").get(function () {
  return calcLateFee(this);
});
fineSchema.virtual("lateFee").get(function () {
  return calcLateFee(this).lateFee;
});
fineSchema.virtual("totalPayable").get(function () {
  return this.amount + calcLateFee(this).lateFee;
});

fineSchema.index({ vessel: 1, status: 1 });

module.exports = mongoose.model("Fine", fineSchema);
