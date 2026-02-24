const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
  name: { type: String, required: true },
  leader: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  joinCode: { type: String, required: true }, // short code for others to join
  isLocked: { type: Boolean, default: false }, // locked = no more joins
  createdAt: { type: Date, default: Date.now },
});

// Each team name must be unique per event
teamSchema.index({ event: 1, name: 1 }, { unique: true });
// Each join code is unique
teamSchema.index({ joinCode: 1 }, { unique: true });

module.exports = mongoose.model("Team", teamSchema);
