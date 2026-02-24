const mongoose = require("mongoose");

const passwordResetRequestSchema = new mongoose.Schema({
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  reason: { type: String, required: true },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  adminComment: { type: String, default: "" },
  // Store generated password temporarily so admin can see it on the approval page
  generatedPassword: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date },
});

module.exports = mongoose.model("PasswordResetRequest", passwordResetRequestSchema);
