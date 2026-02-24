const router = require("express").Router();
const auth = require("../middleware/auth");
const Event = require("../models/Event");
const User = require("../models/User");
const Registration = require("../models/Registration");

// Middleware: ensure user is an organizer
const isOrganizer = async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user || user.role !== "organizer") {
    return res.status(403).json({ msg: "Organizers only" });
  }
  req.organizer = user;
  next();
};

// POST /api/events — create event (organizer only)
router.post("/", auth, isOrganizer, async (req, res) => {
  try {
    const {
      name, description, eventType, eligibility,
      registrationDeadline, startDate, endDate,
      registrationLimit, registrationFee, tags,
      customFields, variants, purchaseLimit,
    } = req.body;

    if (!name || !eventType || !startDate) {
      return res.status(400).json({ msg: "Name, event type, and start date are required" });
    }

    const now = new Date();
    const start = new Date(startDate);

    if (isNaN(start.getTime())) {
      return res.status(400).json({ msg: "Invalid start date" });
    }
    if (start <= now) {
      return res.status(400).json({ msg: "Start date must be in the future" });
    }

    if (endDate) {
      const end = new Date(endDate);
      if (isNaN(end.getTime())) {
        return res.status(400).json({ msg: "Invalid end date" });
      }
      if (end <= start) {
        return res.status(400).json({ msg: "End date must be after the start date" });
      }
    }

    if (registrationDeadline) {
      const deadline = new Date(registrationDeadline);
      if (isNaN(deadline.getTime())) {
        return res.status(400).json({ msg: "Invalid registration deadline" });
      }
      if (deadline <= now) {
        return res.status(400).json({ msg: "Registration deadline must be in the future" });
      }
      if (deadline >= start) {
        return res.status(400).json({ msg: "Registration deadline must be before the start date" });
      }
    }

    const event = new Event({
      name,
      description,
      eventType,
      eligibility: eligibility || "all",
      registrationDeadline,
      startDate,
      endDate,
      registrationLimit: registrationLimit || 0,
      registrationFee: registrationFee || 0,
      organizer: req.user.id,
      tags: tags || [],
      customFields: eventType === "normal" ? (customFields || []) : [],
      variants: eventType === "merchandise" ? (variants || []) : [],
      purchaseLimit: eventType === "merchandise" ? (purchaseLimit || 1) : 1,
    });

    await event.save();
    res.status(201).json(event);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/events/my/profile — get organizer's own profile
router.get("/my/profile", auth, isOrganizer, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "email name category description contactEmail contactNumber discordWebhookUrl"
    );
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// PUT /api/events/my/profile — update organizer profile
router.put("/my/profile", auth, isOrganizer, async (req, res) => {
  try {
    const { name, category, description, contactEmail, contactNumber, discordWebhookUrl } = req.body;
    const user = await User.findById(req.user.id);

    if (name !== undefined) user.name = name;
    if (category !== undefined) user.category = category;
    if (description !== undefined) user.description = description;
    if (contactEmail !== undefined) user.contactEmail = contactEmail;
    if (contactNumber !== undefined) user.contactNumber = contactNumber;
    if (discordWebhookUrl !== undefined) user.discordWebhookUrl = discordWebhookUrl;

    await user.save();
    res.json({
      msg: "Profile updated",
      user: {
        email: user.email, name: user.name, category: user.category,
        description: user.description, contactEmail: user.contactEmail,
        contactNumber: user.contactNumber, discordWebhookUrl: user.discordWebhookUrl,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/events/my — get events created by the logged-in organizer
router.get("/my", auth, isOrganizer, async (req, res) => {
  try {
    const events = await Event.find({ organizer: req.user.id }).sort({ createdAt: -1 });

    // Attach registration count per event
    const ids = events.map((e) => e._id);
    const counts = await Registration.aggregate([
      { $match: { event: { $in: ids }, status: "confirmed" } },
      { $group: { _id: "$event", count: { $sum: 1 } } },
    ]);
    const countMap = {};
    counts.forEach((c) => { countMap[c._id.toString()] = c.count; });

    const result = events.map((e) => ({
      ...e.toObject(),
      registrationCount: countMap[e._id.toString()] || 0,
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/events/my/analytics — aggregate stats for all completed events
router.get("/my/analytics", auth, isOrganizer, async (req, res) => {
  try {
    const events = await Event.find({
      organizer: req.user.id,
      status: { $in: ["completed", "closed"] },
    });

    const ids = events.map((e) => e._id);
    const regs = await Registration.find({ event: { $in: ids }, status: "confirmed" });

    let totalRegistrations = regs.length;
    let totalRevenue = 0;
    let totalMerchSold = 0;

    // Build per-event fee map
    const feeMap = {};
    events.forEach((e) => { feeMap[e._id.toString()] = e.registrationFee || 0; });

    regs.forEach((r) => {
      const fee = feeMap[r.event.toString()] || 0;
      totalRevenue += fee * (r.quantity || 1);
      if (r.selectedVariant) totalMerchSold += r.quantity || 1;
    });

    res.json({
      completedEvents: events.length,
      totalRegistrations,
      totalRevenue,
      totalMerchSold,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/events — get all events with search & filter support
router.get("/", auth, async (req, res) => {
  try {
    const { search, eventType, eligibility, startAfter, startBefore, followedClubs } = req.query;
    const filter = {};

    // Search — partial/fuzzy on event name or organizer name
    if (search) {
      // First find organizers matching the search term
      const matchingOrganizers = await User.find({
        role: "organizer",
        name: { $regex: search, $options: "i" },
      }).select("_id");
      const orgIds = matchingOrganizers.map((o) => o._id);

      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { organizer: { $in: orgIds } },
      ];
    }

    if (eventType && eventType !== "all") {
      filter.eventType = eventType;
    }

    if (eligibility && eligibility !== "all") {
      filter.eligibility = eligibility;
    }

    // Date range filter
    if (startAfter || startBefore) {
      filter.startDate = {};
      if (startAfter) filter.startDate.$gte = new Date(startAfter);
      if (startBefore) filter.startDate.$lte = new Date(startBefore);
    }

    // Followed clubs filter
    if (followedClubs === "true") {
      const user = await User.findById(req.user.id).select("followingClubs");
      if (user && user.followingClubs && user.followingClubs.length > 0) {
        filter.organizer = { $in: user.followingClubs };
      } else {
        return res.json([]);
      }
    }

    const events = await Event.find(filter)
      .populate("organizer", "name category")
      .sort({ startDate: 1 });

    // Attach registration count for each event
    const eventIds = events.map((e) => e._id);
    const regCounts = await Registration.aggregate([
      { $match: { event: { $in: eventIds }, status: "confirmed" } },
      { $group: { _id: "$event", count: { $sum: 1 } } },
    ]);
    const countMap = {};
    regCounts.forEach((r) => { countMap[r._id.toString()] = r.count; });

    const result = events.map((e) => ({
      ...e.toObject(),
      registrationCount: countMap[e._id.toString()] || 0,
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/events/trending — top 5 events by registrations in last 24h
router.get("/trending", auth, async (req, res) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const trending = await Registration.aggregate([
      { $match: { createdAt: { $gte: since }, status: "confirmed" } },
      { $group: { _id: "$event", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    const eventIds = trending.map((t) => t._id);
    const events = await Event.find({ _id: { $in: eventIds } })
      .populate("organizer", "name category");

    // Maintain trending order
    const eventMap = {};
    events.forEach((e) => { eventMap[e._id.toString()] = e; });
    const result = trending
      .filter((t) => eventMap[t._id.toString()])
      .map((t) => ({
        ...eventMap[t._id.toString()].toObject(),
        trendingCount: t.count,
      }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/events/:id/stats — event-level analytics (organizer view)
router.get("/:id/stats", auth, isOrganizer, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ msg: "Event not found" });
    if (event.organizer.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not your event" });
    }

    const regs = await Registration.find({ event: event._id, status: "confirmed" });
    const cancelled = await Registration.countDocuments({ event: event._id, status: "cancelled" });

    let totalRevenue = 0;
    let merchSold = 0;
    const teams = new Set();

    regs.forEach((r) => {
      totalRevenue += (event.registrationFee || 0) * (r.quantity || 1);
      if (r.selectedVariant) merchSold += r.quantity || 1;
      if (r.teamName) teams.add(r.teamName);
    });

    res.json({
      registrations: regs.length,
      cancelled,
      totalRevenue,
      merchSold,
      teams: teams.size,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/events/:id/participants — list participants with search/filter
router.get("/:id/participants", auth, isOrganizer, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ msg: "Event not found" });
    if (event.organizer.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not your event" });
    }

    const { search, status, team } = req.query;
    const filter = { event: event._id };
    if (status && status !== "all") filter.status = status;
    if (team) filter.teamName = { $regex: team, $options: "i" };

    let regs = await Registration.find(filter)
      .populate("participant", "firstName lastName email college contactNumber isIIIT")
      .sort({ createdAt: -1 });

    // Client-side search on participant name or email
    if (search) {
      const s = search.toLowerCase();
      regs = regs.filter((r) => {
        const p = r.participant;
        if (!p) return false;
        const fullName = `${p.firstName || ""} ${p.lastName || ""}`.toLowerCase();
        return fullName.includes(s) || (p.email || "").toLowerCase().includes(s);
      });
    }

    res.json(regs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/events/:id/participants/csv — export participants as CSV
router.get("/:id/participants/csv", auth, isOrganizer, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ msg: "Event not found" });
    if (event.organizer.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not your event" });
    }

    const regs = await Registration.find({ event: event._id })
      .populate("participant", "firstName lastName email college contactNumber")
      .sort({ createdAt: -1 });

    // Build CSV
    const headers = ["Name", "Email", "Reg Date", "Payment", "Team", "Status", "Ticket ID"];
    if (event.eventType === "merchandise") headers.push("Quantity");

    const escape = (v) => `"${String(v || "").replace(/"/g, '""')}"`;

    const rows = regs.map((r) => {
      const p = r.participant || {};
      const row = [
        `${p.firstName || ""} ${p.lastName || ""}`.trim(),
        p.email || "",
        r.createdAt ? new Date(r.createdAt).toISOString() : "",
        (event.registrationFee || 0) * (r.quantity || 1),
        r.teamName || "",
        r.status,
        r.ticketId,
      ];
      if (event.eventType === "merchandise") row.push(r.quantity || 1);
      return row.map(escape).join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${event.name.replace(/[^a-zA-Z0-9]/g, "_")}_participants.csv"`);
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// PUT /api/events/:id/status — change event status with rules
router.put("/:id/status", auth, isOrganizer, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ msg: "Event not found" });
    if (event.organizer.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not your event" });
    }

    const { status } = req.body;
    const allowed = {
      draft:     ["published"],
      published: ["ongoing", "closed"],
      ongoing:   ["completed", "closed"],
      completed: ["closed"],
      closed:    [],
    };

    const current = event.status || "draft";
    if (!allowed[current] || !allowed[current].includes(status)) {
      return res.status(400).json({
        msg: `Cannot change from "${current}" to "${status}". Allowed: ${(allowed[current] || []).join(", ") || "none"}`,
      });
    }

    event.status = status;
    await event.save();

    // Discord webhook — auto-post when event is published
    if (status === "published") {
      try {
        const organizer = await User.findById(req.user.id);
        if (organizer && organizer.discordWebhookUrl) {
          const embed = {
            title: `🎉 ${event.name}`,
            description: event.description || "No description",
            color: 0x2563eb,
            fields: [
              { name: "Type", value: event.eventType, inline: true },
              { name: "Eligibility", value: event.eligibility === "iiit_only" ? "IIIT Only" : "Open to All", inline: true },
              { name: "Start", value: event.startDate ? new Date(event.startDate).toLocaleString() : "TBD", inline: true },
              { name: "Fee", value: event.registrationFee ? `₹${event.registrationFee}` : "Free", inline: true },
            ],
            footer: { text: `Published by ${organizer.name || "Organizer"}` },
            timestamp: new Date().toISOString(),
          };
          fetch(organizer.discordWebhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ embeds: [embed] }),
          }).catch((e) => console.error("Discord webhook error:", e.message));
        }
      } catch (webhookErr) {
        console.error("Discord webhook error:", webhookErr.message);
      }
    }

    res.json({ msg: `Status changed to ${status}`, event });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/events/:id — get single event
router.get("/:id", auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate("organizer", "name category contactEmail");
    if (!event) return res.status(404).json({ msg: "Event not found" });
    res.json(event);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// PUT /api/events/:id — update event (status-based editing rules)
router.put("/:id", auth, isOrganizer, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ msg: "Event not found" });
    if (event.organizer.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not your event" });
    }

    const status = event.status || "draft";

    // Ongoing, completed, closed — no edits allowed
    if (["ongoing", "completed", "closed"].includes(status)) {
      return res.status(400).json({ msg: `Cannot edit event in "${status}" status. Use status change instead.` });
    }

    // Determine allowed fields based on status
    let allowed;
    if (status === "draft") {
      // Draft: free edits on everything
      allowed = [
        "name", "description", "eventType", "eligibility",
        "registrationDeadline", "startDate", "endDate",
        "registrationLimit", "registrationFee", "tags",
        "customFields", "variants", "purchaseLimit",
      ];
    } else if (status === "published") {
      // Published: limited edits
      allowed = ["description", "registrationDeadline", "registrationLimit"];
    }

    // Check if form fields are locked (has registrations)
    if (req.body.customFields || req.body.variants) {
      const regCount = await Registration.countDocuments({ event: event._id, status: "confirmed" });
      if (regCount > 0) {
        return res.status(400).json({ msg: "Cannot modify form fields after participants have registered." });
      }
    }

    const { startDate: newStart, endDate: newEnd, registrationDeadline: newDeadline } = req.body;
    const now = new Date();
    const startToCheck = newStart ? new Date(newStart) : event.startDate;

    if (newStart && allowed.includes("startDate")) {
      const s = new Date(newStart);
      if (isNaN(s.getTime())) return res.status(400).json({ msg: "Invalid start date" });
      if (s <= now) return res.status(400).json({ msg: "Start date must be in the future" });
    }

    if (newEnd !== undefined && newEnd !== "" && allowed.includes("endDate")) {
      const e = new Date(newEnd);
      if (isNaN(e.getTime())) return res.status(400).json({ msg: "Invalid end date" });
      if (e <= startToCheck) return res.status(400).json({ msg: "End date must be after the start date" });
    }

    if (newDeadline !== undefined && newDeadline !== "" && allowed.includes("registrationDeadline")) {
      const d = new Date(newDeadline);
      if (isNaN(d.getTime())) return res.status(400).json({ msg: "Invalid registration deadline" });
      if (d <= now) return res.status(400).json({ msg: "Registration deadline must be in the future" });
      if (d >= startToCheck) return res.status(400).json({ msg: "Registration deadline must be before the start date" });
    }

    allowed.forEach((field) => {
      if (req.body[field] !== undefined) event[field] = req.body[field];
    });

    await event.save();
    res.json(event);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// DELETE /api/events/:id — delete event (organizer who owns it)
router.delete("/:id", auth, isOrganizer, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ msg: "Event not found" });
    if (event.organizer.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not your event" });
    }
    await event.deleteOne();
    res.json({ msg: "Event deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
