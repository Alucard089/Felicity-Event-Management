const router = require("express").Router();
const auth = require("../middleware/auth");
const Feedback = require("../models/Feedback");
const Event = require("../models/Event");
const Registration = require("../models/Registration");

// POST /api/feedback/:eventId — submit anonymous feedback
router.post("/:eventId", auth, async (req, res) => {
  try {
    const { rating, comment } = req.body;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ msg: "Rating must be between 1 and 5" });
    }

    // Check event exists and is completed/closed
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ msg: "Event not found" });
    if (!["completed", "closed"].includes(event.status)) {
      return res.status(400).json({ msg: "Feedback can only be submitted for completed events" });
    }

    // Check user is registered for this event
    const registration = await Registration.findOne({
      event: req.params.eventId,
      participant: req.user.id,
      status: "confirmed",
    });
    if (!registration) {
      return res.status(403).json({ msg: "You must be registered for this event to leave feedback" });
    }

    // Check if already submitted
    const existing = await Feedback.findOne({
      event: req.params.eventId,
      participant: req.user.id,
    });
    if (existing) {
      return res.status(400).json({ msg: "You have already submitted feedback for this event" });
    }

    const feedback = new Feedback({
      event: req.params.eventId,
      participant: req.user.id,
      rating: Math.round(rating),
      comment: comment || "",
    });
    await feedback.save();

    res.status(201).json({ msg: "Feedback submitted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/feedback/:eventId — get all feedback for an event (anonymous — no user info returned)
router.get("/:eventId", auth, async (req, res) => {
  try {
    const { filterRating } = req.query;

    const query = { event: req.params.eventId };
    if (filterRating && filterRating !== "all") {
      query.rating = Number(filterRating);
    }

    // Fetch feedback WITHOUT participant info (anonymous)
    const feedbacks = await Feedback.find(query)
      .select("rating comment createdAt")
      .sort({ createdAt: -1 });

    // Compute aggregated stats (always from all feedback, not filtered)
    const allFeedback = await Feedback.find({ event: req.params.eventId });
    const total = allFeedback.length;
    const avgRating = total > 0
      ? (allFeedback.reduce((sum, f) => sum + f.rating, 0) / total).toFixed(1)
      : 0;

    // Count per star
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    allFeedback.forEach((f) => { distribution[f.rating]++; });

    res.json({
      feedbacks,
      stats: { total, avgRating: Number(avgRating), distribution },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/feedback/:eventId/my — check if current user has submitted feedback
router.get("/:eventId/my", auth, async (req, res) => {
  try {
    const feedback = await Feedback.findOne({
      event: req.params.eventId,
      participant: req.user.id,
    });
    res.json({ submitted: !!feedback, feedback: feedback ? { rating: feedback.rating, comment: feedback.comment } : null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
