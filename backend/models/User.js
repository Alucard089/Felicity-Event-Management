const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  // Common fields
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ["participant", "organizer", "admin"],
    required: true,
  },

  // Participant fields
  firstName: { type: String },
  lastName: { type: String },
  isIIIT: { type: Boolean, default: false },
  college: { type: String },
  contactNumber: { type: String },
  interests: { type: [String], default: [] },
  followingClubs: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  onboarded: { type: Boolean, default: false },

  // Organizer fields
  name: { type: String },
  category: { type: String },
  description: { type: String },
  contactEmail: { type: String },
  contactNumber: { type: String },
  discordWebhookUrl: { type: String },

  // Account status (for admin disable/archive)
  active: { type: Boolean, default: true },

  // Password reset request (organizers request, admin fulfills)
  passwordResetRequested: { type: Boolean, default: false },
  passwordResetRequestedAt: { type: Date },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", userSchema);
