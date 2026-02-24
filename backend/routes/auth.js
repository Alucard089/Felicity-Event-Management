const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Helper: check if email belongs to IIIT domain
function isIIITEmail(email) {
  return (
    email.endsWith("@students.iiit.ac.in") ||
    email.endsWith("@research.iiit.ac.in")
  );
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { firstName, lastName, email, password, college, contactNumber, role } = req.body;

    // Basic validation
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ msg: "Please fill all required fields" });
    }

    // Only participants can self-register
    if (role && role !== "participant") {
      return res.status(403).json({ msg: "Only participants can register. Organizers are provisioned by the Admin." });
    }

    // Check if user already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ msg: "User already exists" });
    }

    // Auto-detect IIIT status from email
    const detectedIIIT = isIIITEmail(email);

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const user = new User({
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      email,
      password: hashed,
      role: "participant",
      isIIIT: detectedIIIT,
      college: college || "",
      contactNumber: contactNumber || "",
    });

    await user.save();

    // Create JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id, firstName: user.firstName, lastName: user.lastName,
        name: user.name, email: user.email, role: user.role,
        isIIIT: user.isIIIT, college: user.college,
        contactNumber: user.contactNumber, onboarded: user.onboarded,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ msg: "Please fill all fields" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    // Block disabled accounts
    if (user.active === false) {
      return res.status(403).json({ msg: "Your account has been disabled. Contact the administrator." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user._id, firstName: user.firstName, lastName: user.lastName,
        name: user.name, email: user.email, role: user.role,
        isIIIT: user.isIIIT, college: user.college,
        contactNumber: user.contactNumber, onboarded: user.onboarded,
        category: user.category, description: user.description,
        contactEmail: user.contactEmail,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/auth/me — verify token and return user info
const auth = require("../middleware/auth");

router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ msg: "User not found" });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// PUT /api/auth/profile — update editable profile fields
router.put("/profile", auth, async (req, res) => {
  try {
    const { firstName, lastName, contactNumber, college } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (firstName !== undefined || lastName !== undefined) {
      user.name = `${user.firstName} ${user.lastName}`;
    }
    if (contactNumber !== undefined) user.contactNumber = contactNumber;
    if (college !== undefined) user.college = college;

    await user.save();

    const updated = user.toObject();
    delete updated.password;
    res.json({ msg: "Profile updated", user: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// PUT /api/auth/change-password — change password with current password verification
router.put("/change-password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ msg: "Current and new password are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ msg: "New password must be at least 6 characters" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Current password is incorrect" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ msg: "Password changed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
