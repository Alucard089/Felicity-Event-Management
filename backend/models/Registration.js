const mongoose = require("mongoose");

const registrationSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
  participant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  ticketId: { type: String, required: true, unique: true },
  status: {
    type: String,
    enum: ["confirmed", "cancelled", "rejected", "pending_payment", "pending_approval"],
    default: "confirmed",
  },
  // Normal event — custom field responses
  customFieldResponses: { type: Object, default: {} },
  // Merchandise event
  selectedVariant: { type: mongoose.Schema.Types.ObjectId },
  quantity: { type: Number, default: 1 },
  // Ticket metadata
  teamName: { type: String, default: "" },
  // Payment proof for merchandise events
  paymentProofData: { type: String, default: "" }, // base64 image data
  paymentStatus: {
    type: String,
    enum: ["not_required", "awaiting_proof", "pending", "approved", "rejected"],
    default: "not_required",
  },
  createdAt: { type: Date, default: Date.now },
});

// Prevent duplicate registrations for the same event
registrationSchema.index({ event: 1, participant: 1 }, { unique: true });

module.exports = mongoose.model("Registration", registrationSchema);
