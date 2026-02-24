const router = require("express").Router();
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const auth = require("../middleware/auth");
const User = require("../models/User");
const PasswordResetRequest = require("../models/PasswordResetRequest");

// Middleware: check if user is admin
function adminOnly(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ msg: "Admin access only" });
  }
  next();
}

// Helper: generate a secure random password
function generatePassword(length = 12) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
  let pass = "";
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    pass += chars[bytes[i] % chars.length];
  }
  return pass;
}

// POST /api/admin/create-organizer — create an organizer with auto-generated credentials
router.post("/create-organizer", auth, adminOnly, async (req, res) => {
  try {
    const { name, email, category, description, contactEmail } = req.body;

    if (!name || !email) {
      return res.status(400).json({ msg: "Name and email are required" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ msg: "User with this email already exists" });
    }

    // Auto-generate password
    const plainPassword = generatePassword(12);

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(plainPassword, salt);

    const organizer = new User({
      name,
      email,
      password: hashed,
      role: "organizer",
      category: category || "",
      description: description || "",
      contactEmail: contactEmail || email,
      active: true,
    });

    await organizer.save();

    res.status(201).json({
      msg: "Organizer created",
      credentials: {
        email: organizer.email,
        password: plainPassword, // Admin sees this once and shares it
      },
      organizer: {
        id: organizer._id, name: organizer.name, email: organizer.email,
        role: organizer.role, category: organizer.category,
        description: organizer.description, contactEmail: organizer.contactEmail,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/admin/organizers — list all organizers (including disabled)
router.get("/organizers", auth, adminOnly, async (req, res) => {
  try {
    const organizers = await User.find({ role: "organizer" }).select("-password").sort({ createdAt: -1 });
    res.json(organizers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// PUT /api/admin/organizer/:id/toggle — disable or enable an organizer account
router.put("/organizer/:id/toggle", auth, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role !== "organizer") {
      return res.status(404).json({ msg: "Organizer not found" });
    }
    user.active = !user.active;
    await user.save();
    res.json({ msg: user.active ? "Account enabled" : "Account disabled", active: user.active });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// DELETE /api/admin/organizer/:id — permanently delete an organizer
router.delete("/organizer/:id", auth, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role !== "organizer") {
      return res.status(404).json({ msg: "Organizer not found" });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ msg: "Organizer permanently deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ----- Password Reset Workflow (Tier B Feature) -----

// POST /api/admin/request-reset — organizer requests a password reset with reason
router.post("/request-reset", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== "organizer") {
      return res.status(403).json({ msg: "Only organizer accounts can request password resets" });
    }

    const { reason } = req.body;
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ msg: "Please provide a reason for the password reset" });
    }

    // Check if there's already a pending request
    const existing = await PasswordResetRequest.findOne({
      organizer: req.user.id,
      status: "pending",
    });
    if (existing) {
      return res.status(400).json({ msg: "You already have a pending password reset request" });
    }

    const request = new PasswordResetRequest({
      organizer: req.user.id,
      reason: reason.trim(),
    });
    await request.save();

    res.json({ msg: "Password reset request submitted. An admin will review it shortly." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/admin/reset-requests — list all password reset requests (admin)
// Supports ?status=pending|approved|rejected (defaults to all)
router.get("/reset-requests", auth, adminOnly, async (req, res) => {
  try {
    const filter = {};
    if (req.query.status && req.query.status !== "all") {
      filter.status = req.query.status;
    }

    const requests = await PasswordResetRequest.find(filter)
      .populate("organizer", "name email category")
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// POST /api/admin/approve-reset/:id — admin approves a reset request
router.post("/approve-reset/:id", auth, adminOnly, async (req, res) => {
  try {
    const request = await PasswordResetRequest.findById(req.params.id).populate("organizer", "name email");
    if (!request) return res.status(404).json({ msg: "Request not found" });
    if (request.status !== "pending") {
      return res.status(400).json({ msg: "This request has already been resolved" });
    }

    const { comment } = req.body;

    // Generate new password
    const newPassword = generatePassword(12);
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(newPassword, salt);

    // Update the organizer's password
    await User.findByIdAndUpdate(request.organizer._id, { password: hashed });

    // Update the request
    request.status = "approved";
    request.adminComment = comment || "";
    request.generatedPassword = newPassword; // stored so admin can view later on the same page
    request.resolvedAt = new Date();
    await request.save();

    res.json({
      msg: "Password reset approved",
      credentials: { email: request.organizer.email, password: newPassword },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// POST /api/admin/reject-reset/:id — admin rejects a reset request
router.post("/reject-reset/:id", auth, adminOnly, async (req, res) => {
  try {
    const request = await PasswordResetRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ msg: "Request not found" });
    if (request.status !== "pending") {
      return res.status(400).json({ msg: "This request has already been resolved" });
    }

    const { comment } = req.body;
    request.status = "rejected";
    request.adminComment = comment || "";
    request.resolvedAt = new Date();
    await request.save();

    res.json({ msg: "Password reset request rejected" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/admin/my-reset-status — organizer checks their own latest request status
router.get("/my-reset-status", auth, async (req, res) => {
  try {
    const latest = await PasswordResetRequest.findOne({ organizer: req.user.id })
      .sort({ createdAt: -1 });
    if (!latest) return res.json({ hasRequest: false });
    res.json({
      hasRequest: true,
      status: latest.status,
      reason: latest.reason,
      adminComment: latest.adminComment,
      createdAt: latest.createdAt,
      resolvedAt: latest.resolvedAt,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
