const mongoose = require("mongoose");

// Schema for custom form fields (Normal events)
const formFieldSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    type: {
      type: String,
      enum: ["text", "number", "email", "select", "checkbox", "textarea"],
      default: "text",
    },
    required: { type: Boolean, default: false },
    options: [String], // for select type
  },
  { _id: false }
);

// Schema for merchandise variants
const variantSchema = new mongoose.Schema(
  {
    size: { type: String },
    color: { type: String },
    label: { type: String }, // e.g. "Red - XL"
    stock: { type: Number, default: 0 },
  },
  { _id: true }
);

const eventSchema = new mongoose.Schema({
  // Core attributes (Section 8)
  name: { type: String, required: true },
  description: { type: String },
  eventType: {
    type: String,
    enum: ["normal", "merchandise", "hackathon"],
    required: true,
  },
  status: {
    type: String,
    enum: ["draft", "published", "ongoing", "completed", "closed"],
    default: "draft",
  },
  eligibility: { type: String, default: "all" }, // "all", "iiit_only"
  registrationDeadline: { type: Date },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  registrationLimit: { type: Number, default: 0 }, // 0 = unlimited
  registrationFee: { type: Number, default: 0 },
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  tags: [String], // uses same interest/category vocabulary

  // Normal event: custom registration form fields
  customFields: [formFieldSchema],

  // Merchandise event fields
  variants: [variantSchema],
  purchaseLimit: { type: Number, default: 1 }, // max items per participant

  // Hackathon event fields
  maxTeamSize: { type: Number, default: 4 },
  minTeamSize: { type: Number, default: 2 },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Event", eventSchema);
