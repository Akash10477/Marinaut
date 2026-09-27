const mongoose = require("mongoose");

const PAYMENT_METHODS = ["bKash", "Nagad", "Rocket", "Card", "Cash"];

const paymentSchema = new mongoose.Schema(
  {
    fine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Fine",
      required: true,
      unique: true // a fine can be paid only once
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    fineAmount: { type: Number, required: true },
    lateFee: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    method: {
      type: String,
      enum: {
        values: PAYMENT_METHODS,
        message: "`{VALUE}` is not a valid payment method"
      },
      required: [true, "Payment method is required"]
    },
    transactionId: {
      type: String,
      required: true,
      unique: true
    },
    paidAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

paymentSchema.statics.METHODS = PAYMENT_METHODS;

module.exports = mongoose.model("Payment", paymentSchema);
