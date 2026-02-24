const router = require("express").Router();
const auth = require("../middleware/auth");
const DiscussionMessage = require("../models/DiscussionMessage");
const Event = require("../models/Event");
const Registration = require("../models/Registration");

// GET /api/discussions/:eventId — get all messages for an event
router.get("/:eventId", auth, async (req, res) => {
  try {
    const messages = await DiscussionMessage.find({
      event: req.params.eventId,
      isDeleted: false,
    })
      .populate("author", "firstName lastName name role email")
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// POST /api/discussions/:eventId — post a new message
router.post("/:eventId", auth, async (req, res) => {
  try {
    const { content, parentMessage, isAnnouncement } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ msg: "Message content is required" });
    }

    // Check event exists
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ msg: "Event not found" });

    // Check authorization: must be event organizer or registered participant
    const isEventOrganizer = event.organizer.toString() === req.user.id;

    if (!isEventOrganizer) {
      // Must be a registered participant
      const reg = await Registration.findOne({
        event: req.params.eventId,
        participant: req.user.id,
        status: "confirmed",
      });
      if (!reg) {
        return res.status(403).json({ msg: "You must be registered for this event to post" });
      }
    }

    const message = new DiscussionMessage({
      event: req.params.eventId,
      author: req.user.id,
      content: content.trim(),
      parentMessage: parentMessage || null,
      isAnnouncement: isEventOrganizer && isAnnouncement ? true : false,
    });

    await message.save();

    // Populate author before returning
    await message.populate("author", "firstName lastName name role email");

    // Emit via Socket.io if available
    const io = req.app.get("io");
    if (io) {
      io.to(`event_${req.params.eventId}`).emit("new_message", message);
    }

    res.status(201).json(message);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// PUT /api/discussions/:messageId/pin — toggle pin (organizer only)
router.put("/:messageId/pin", auth, async (req, res) => {
  try {
    const message = await DiscussionMessage.findById(req.params.messageId);
    if (!message) return res.status(404).json({ msg: "Message not found" });

    const event = await Event.findById(message.event);
    if (!event || event.organizer.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Only the event organizer can pin messages" });
    }

    message.isPinned = !message.isPinned;
    await message.save();

    const io = req.app.get("io");
    if (io) {
      io.to(`event_${message.event}`).emit("message_updated", {
        messageId: message._id,
        isPinned: message.isPinned,
      });
    }

    res.json({ msg: message.isPinned ? "Message pinned" : "Message unpinned", isPinned: message.isPinned });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// DELETE /api/discussions/:messageId — soft delete (organizer moderation)
router.delete("/:messageId", auth, async (req, res) => {
  try {
    const message = await DiscussionMessage.findById(req.params.messageId);
    if (!message) return res.status(404).json({ msg: "Message not found" });

    const event = await Event.findById(message.event);
    if (!event || event.organizer.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Only the event organizer can delete messages" });
    }

    message.isDeleted = true;
    await message.save();

    const io = req.app.get("io");
    if (io) {
      io.to(`event_${message.event}`).emit("message_deleted", { messageId: message._id });
    }

    res.json({ msg: "Message deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// POST /api/discussions/:messageId/react — toggle an emoji reaction
router.post("/:messageId/react", auth, async (req, res) => {
  try {
    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ msg: "Emoji is required" });

    const message = await DiscussionMessage.findById(req.params.messageId);
    if (!message || message.isDeleted) {
      return res.status(404).json({ msg: "Message not found" });
    }

    const userId = req.user.id;

    // Get current users for this emoji (or empty array)
    const users = message.reactions.get(emoji) || [];
    const idx = users.indexOf(userId);

    if (idx === -1) {
      // Add reaction
      users.push(userId);
    } else {
      // Remove reaction (toggle off)
      users.splice(idx, 1);
    }

    if (users.length === 0) {
      message.reactions.delete(emoji);
    } else {
      message.reactions.set(emoji, users);
    }

    await message.save();

    // Build a simple reactions object to broadcast
    const reactionsObj = {};
    message.reactions.forEach((val, key) => {
      reactionsObj[key] = val;
    });

    const io = req.app.get("io");
    if (io) {
      io.to(`event_${message.event}`).emit("message_reacted", {
        messageId: message._id,
        reactions: reactionsObj,
      });
    }

    res.json({ reactions: reactionsObj });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
