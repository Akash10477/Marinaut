const mongoose = require("mongoose");

// Auto-increment sequence (fine number: MRN-2026-000001)
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

counterSchema.statics.next = async function (name) {
  const doc = await this.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { returnDocument: "after", upsert: true }
  );
  return doc.seq;
};

module.exports = mongoose.model("Counter", counterSchema);
