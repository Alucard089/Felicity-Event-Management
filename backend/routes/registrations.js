const router = require("express").Router();
const crypto = require("crypto");
const auth = require("../middleware/auth");
const Registration = require("../models/Registration");
const Event = require("../models/Event");
const User = require("../models/User");
const { sendTicketEmail } = require("../utils/mailer");

// Generate a unique ticket ID
function generateTicketId() {
  return "TKT-" + crypto.randomBytes(6).toString("hex").toUpperCase();
}

// POST /api/registrations/:eventId — register for an event
router.post("/:eventId", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== "participant") {
      return res.status(403).json({ msg: "Only participants can register" });
    }

    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ msg: "Event not found" });

    // Check eligibility
    if (event.eligibility === "iiit_only" && !user.isIIIT) {
      return res.status(403).json({ msg: "This event is restricted to IIIT students" });
    }

    // Check registration deadline
    if (event.registrationDeadline && new Date(event.registrationDeadline) < new Date()) {
      return res.status(400).json({ msg: "Registration deadline has passed" });
    }

    // Check if event has already started
    if (new Date(event.startDate) < new Date()) {
      return res.status(400).json({ msg: "This event has already started" });
    }

    // Check duplicate registration
    const existing = await Registration.findOne({
      event: event._id,
      participant: user._id,
      status: { $ne: "cancelled" },
    });
    if (existing) {
      return res.status(400).json({ msg: "You are already registered for this event" });
    }

    const { customFieldResponses, selectedVariant, quantity, teamName } = req.body;

    // Normal event — check registration limit
    if (event.eventType === "normal") {
      if (event.registrationLimit > 0) {
        const count = await Registration.countDocuments({
          event: event._id,
          status: "confirmed",
        });
        if (count >= event.registrationLimit) {
          return res.status(400).json({ msg: "Registration limit reached" });
        }
      }
    }

    // Merchandise event — check stock & purchase limit (but DON'T decrement stock yet)
    if (event.eventType === "merchandise") {
      if (!selectedVariant) {
        return res.status(400).json({ msg: "Please select a variant" });
      }
      const qty = quantity || 1;

      const variant = event.variants.id(selectedVariant);
      if (!variant) {
        return res.status(400).json({ msg: "Invalid variant selected" });
      }
      if (variant.stock < qty) {
        return res.status(400).json({ msg: `Only ${variant.stock} items left in stock` });
      }

      // Check purchase limit — total purchases by this user for this event
      const prevPurchases = await Registration.aggregate([
        {
          $match: {
            event: event._id,
            participant: user._id,
            status: { $in: ["confirmed", "pending_payment", "pending_approval"] },
          },
        },
        { $group: { _id: null, total: { $sum: "$quantity" } } },
      ]);
      const totalSoFar = prevPurchases.length > 0 ? prevPurchases[0].total : 0;
      if (totalSoFar + qty > event.purchaseLimit) {
        return res.status(400).json({
          msg: `Purchase limit is ${event.purchaseLimit} per person. You have already purchased ${totalSoFar}.`,
        });
      }

      // NOTE: Stock is NOT decremented here — it is decremented when payment is approved
    }

    const ticketId = generateTicketId();

    // Merchandise events start as "pending_payment" (must upload proof before approval)
    const isMerch = event.eventType === "merchandise";

    const registration = new Registration({
      event: event._id,
      participant: user._id,
      ticketId,
      status: isMerch ? "pending_payment" : "confirmed",
      customFieldResponses: event.eventType === "normal" ? (customFieldResponses || {}) : {},
      selectedVariant: isMerch ? selectedVariant : undefined,
      quantity: isMerch ? (quantity || 1) : 1,
      teamName: teamName || "",
      paymentStatus: isMerch ? "awaiting_proof" : "not_required",
    });

    await registration.save();

    // Populate for response
    const populated = await Registration.findById(registration._id)
      .populate({
        path: "event",
        populate: { path: "organizer", select: "name" },
      })
      .populate("participant", "firstName lastName email college");

    res.status(201).json({
      msg: isMerch
        ? "Order placed! Please upload your payment proof."
        : "Registration successful",
      registration: populated,
      ticketId,
    });

    // Send confirmation email only for normal events (merchandise waits for payment approval)
    if (!isMerch) {
      const p = populated.participant;
      const e = populated.event;

      sendTicketEmail(p.email, {
        participantName:  `${p.firstName} ${p.lastName}`,
        participantEmail: p.email,
        college:          p.college || "",
        eventName:        e.name,
        eventType:        e.eventType,
        organizerName:    e.organizer?.name || "—",
        startDate:        e.startDate,
        endDate:          e.endDate || null,
        ticketId,
        teamName:         teamName || "",
      });
    }
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ msg: "You are already registered for this event" });
    }
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/registrations — get all registrations for logged-in participant
router.get("/", auth, async (req, res) => {
  try {
    const regs = await Registration.find({ participant: req.user.id })
      .populate({
        path: "event",
        populate: { path: "organizer", select: "name category" },
      })
      .sort({ createdAt: -1 });
    res.json(regs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/registrations/ticket/:ticketId — get specific ticket
router.get("/ticket/:ticketId", auth, async (req, res) => {
  try {
    const reg = await Registration.findOne({ ticketId: req.params.ticketId })
      .populate({
        path: "event",
        populate: { path: "organizer", select: "name category contactEmail" },
      })
      .populate("participant", "firstName lastName email college contactNumber");
    if (!reg) return res.status(404).json({ msg: "Ticket not found" });
    res.json(reg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// PUT /api/registrations/:id/cancel — cancel a registration
router.put("/:id/cancel", auth, async (req, res) => {
  try {
    const reg = await Registration.findById(req.params.id);
    if (!reg) return res.status(404).json({ msg: "Registration not found" });
    if (reg.participant.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not your registration" });
    }
    if (reg.status === "cancelled") {
      return res.status(400).json({ msg: "Already cancelled" });
    }

    reg.status = "cancelled";
    await reg.save();

    // Restore stock if merchandise AND was already confirmed (approved)
    if (reg.selectedVariant && reg.paymentStatus === "approved") {
      const event = await Event.findById(reg.event);
      if (event) {
        const variant = event.variants.id(reg.selectedVariant);
        if (variant) {
          variant.stock += reg.quantity || 1;
          await event.save();
        }
      }
    }

    res.json({ msg: "Registration cancelled", registration: reg });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ===== PAYMENT PROOF WORKFLOW =====

// POST /api/registrations/:id/upload-proof — participant uploads payment proof image
router.post("/:id/upload-proof", auth, async (req, res) => {
  try {
    const reg = await Registration.findById(req.params.id);
    if (!reg) return res.status(404).json({ msg: "Registration not found" });
    if (reg.participant.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not your registration" });
    }
    if (reg.paymentStatus === "not_required") {
      return res.status(400).json({ msg: "Payment proof is not required for this registration" });
    }
    if (reg.paymentStatus === "approved") {
      return res.status(400).json({ msg: "Payment has already been approved" });
    }
    if (reg.paymentStatus === "pending") {
      return res.status(400).json({ msg: "Payment proof already uploaded and awaiting approval" });
    }

    const { imageData } = req.body;
    if (!imageData || !imageData.startsWith("data:image/")) {
      return res.status(400).json({ msg: "Please upload a valid image" });
    }

    reg.paymentProofData = imageData;
    reg.paymentStatus = "pending";
    reg.status = "pending_approval";
    await reg.save();

    res.json({ msg: "Payment proof uploaded. Waiting for organizer approval." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/registrations/event/:eventId/payment-proofs — organizer views all payment proof submissions
router.get("/event/:eventId/payment-proofs", auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ msg: "Event not found" });
    if (event.organizer.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not your event" });
    }

    const { status } = req.query;
    const filter = {
      event: req.params.eventId,
      paymentStatus: { $ne: "not_required" },
    };
    if (status && status !== "all") {
      filter.paymentStatus = status;
    }

    const orders = await Registration.find(filter)
      .populate("participant", "firstName lastName email college")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// POST /api/registrations/:id/approve-payment — organizer approves payment
router.post("/:id/approve-payment", auth, async (req, res) => {
  try {
    const reg = await Registration.findById(req.params.id).populate("participant", "firstName lastName email college");
    if (!reg) return res.status(404).json({ msg: "Registration not found" });

    const event = await Event.findById(reg.event);
    if (!event || event.organizer.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not your event" });
    }

    if (reg.paymentStatus !== "pending") {
      return res.status(400).json({ msg: "This order is not pending approval" });
    }

    // Decrement stock
    if (reg.selectedVariant) {
      const variant = event.variants.id(reg.selectedVariant);
      if (variant) {
        if (variant.stock < (reg.quantity || 1)) {
          return res.status(400).json({ msg: "Not enough stock to approve this order" });
        }
        variant.stock -= reg.quantity || 1;
        await event.save();
      }
    }

    reg.paymentStatus = "approved";
    reg.status = "confirmed";
    await reg.save();

    res.json({ msg: "Payment approved. Order confirmed.", registration: reg });

    // Send confirmation email with ticket (fire-and-forget)
    const p = reg.participant;
    const variantLabel = reg.selectedVariant
      ? (() => {
          const v = event.variants.id(reg.selectedVariant);
          return v ? (v.label || `${v.size || ""} ${v.color || ""}`).trim() : "";
        })()
      : undefined;

    sendTicketEmail(p.email, {
      participantName:  `${p.firstName} ${p.lastName}`,
      participantEmail: p.email,
      college:          p.college || "",
      eventName:        event.name,
      eventType:        event.eventType,
      organizerName:    "—",
      startDate:        event.startDate,
      endDate:          event.endDate || null,
      ticketId:         reg.ticketId,
      teamName:         reg.teamName || "",
      quantity:         reg.quantity || 1,
      variantLabel,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// POST /api/registrations/:id/reject-payment — organizer rejects payment
router.post("/:id/reject-payment", auth, async (req, res) => {
  try {
    const reg = await Registration.findById(req.params.id);
    if (!reg) return res.status(404).json({ msg: "Registration not found" });

    const event = await Event.findById(reg.event);
    if (!event || event.organizer.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not your event" });
    }

    if (reg.paymentStatus !== "pending") {
      return res.status(400).json({ msg: "This order is not pending approval" });
    }

    reg.paymentStatus = "rejected";
    reg.status = "rejected";
    // Clear old proof data so participant can re-upload
    reg.paymentProofData = "";
    await reg.save();

    res.json({ msg: "Payment rejected.", registration: reg });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
