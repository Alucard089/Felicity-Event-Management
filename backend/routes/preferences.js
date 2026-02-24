const router = require("express").Router();
const auth = require("../middleware/auth");
const User = require("../models/User");

// Available interest categories — aligned with IIIT-H clubs
const INTEREST_OPTIONS = [
  "Technology",
  "Robotics & Electronics",
  "Sports",
  "Dramatics",
  "Design",
  "Comedy & Humour",
  "Literature",
  "Photography",
  "Fashion",
  "Art",
  "Chess",
  "Dance",
  "Debate",
  "Gaming",
  "Language & Culture",
  "Music",
  "Quiz",
  "Career & Motivation",
  "Community & Inclusion",
];

// GET /api/preferences/options — return available interests + clubs list
router.get("/options", auth, async (req, res) => {
  try {
    const clubs = await User.find({ role: "organizer" }).select("name _id category");
    res.json({ interests: INTEREST_OPTIONS, clubs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/preferences — get current user's preferences
router.get("/", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("interests followingClubs onboarded");
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/preferences/organizers — list all organizers (for Clubs/Organizers page)
router.get("/organizers", auth, async (req, res) => {
  try {
    const organizers = await User.find({ role: "organizer" }).select(
      "name category description contactEmail _id"
    );
    // Also return the current user's followingClubs list
    const me = await User.findById(req.user.id).select("followingClubs");
    res.json({ organizers, following: me.followingClubs || [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// POST /api/preferences/follow/:id — toggle follow for a single organizer
router.post("/follow/:id", auth, async (req, res) => {
  try {
    const orgId = req.params.id;
    // Verify organizer exists
    const org = await User.findById(orgId);
    if (!org || org.role !== "organizer") {
      return res.status(404).json({ msg: "Organizer not found" });
    }

    const user = await User.findById(req.user.id);
    const idx = user.followingClubs.findIndex((id) => id.toString() === orgId);
    if (idx === -1) {
      user.followingClubs.push(orgId);
    } else {
      user.followingClubs.splice(idx, 1);
    }
    await user.save();

    res.json({ followingClubs: user.followingClubs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/preferences/organizer/:id — single organizer detail + their events
router.get("/organizer/:id", auth, async (req, res) => {
  try {
    const Event = require("../models/Event");
    const org = await User.findById(req.params.id).select(
      "name category description contactEmail _id"
    );
    if (!org || org.role !== "organizer") {
      return res.status(404).json({ msg: "Organizer not found" });
    }

    const now = new Date();
    const upcoming = await Event.find({ organizer: org._id, startDate: { $gte: now } })
      .sort({ startDate: 1 })
      .select("title eventType startDate endDate registrationDeadline tags");
    const past = await Event.find({ organizer: org._id, startDate: { $lt: now } })
      .sort({ startDate: -1 })
      .select("title eventType startDate endDate tags");

    const me = await User.findById(req.user.id).select("followingClubs");
    const isFollowing = me.followingClubs.some((id) => id.toString() === org._id.toString());

    res.json({ organizer: org, upcoming, past, isFollowing });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// PUT /api/preferences — save preferences
router.put("/", auth, async (req, res) => {
  try {
    const { interests, followingClubs } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { interests: interests || [], followingClubs: followingClubs || [], onboarded: true },
      { new: true }
    ).select("-password");

    res.json({
      msg: "Preferences saved",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isIIIT: user.isIIIT,
        onboarded: user.onboarded,
        interests: user.interests,
        followingClubs: user.followingClubs,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
