const mongoose = require("mongoose");

const discussionMessageSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true },
  // Threading — if this is a reply to another message
  parentMessage: { type: mongoose.Schema.Types.ObjectId, ref: "DiscussionMessage", default: null },
  // Organizer features
  isPinned: { type: Boolean, default: false },
  isAnnouncement: { type: Boolean, default: false },
  // Emoji reactions — Map of emoji -> array of user IDs
  reactions: { type: Map, of: [String], default: {} },
  // Soft delete (organizer moderation)
  isDeleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("DiscussionMessage", discussionMessageSchema);
