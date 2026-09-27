const mongoose = require("mongoose");

// admin  = runs the system, approves Naval Police, manages violation types
// police = Naval Police, issues fines
// owner  = vessel owner, sees own vessels + fines, pays fines
const ROLES = ["admin", "police", "owner"];

// Self-registered Naval Police stay "pending" until an admin approves them
const APPROVAL = ["pending", "approved", "rejected"];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"]
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false // password is excluded from queries by default
    },
    phone: {
      type: String,
      trim: true
    },
    role: {
      type: String,
      enum: ROLES,
      default: "owner"
    },
    // Naval Police badge / service number
    badgeNumber: {
      type: String,
      trim: true
    },
    approvalStatus: {
      type: String,
      enum: APPROVAL,
      default: "approved"
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

userSchema.statics.ROLES = ROLES;
userSchema.statics.APPROVAL = APPROVAL;

module.exports = mongoose.model("User", userSchema);
