const router = require("express").Router();
const crypto = require("crypto");
const auth = require("../middleware/auth");
const Team = require("../models/Team");
const Event = require("../models/Event");
const Registration = require("../models/Registration");

// Generate a short 6-char join code
function generateJoinCode() {
  return crypto.randomBytes(3).toString("hex").toUpperCase();
}

// POST /api/teams/:eventId — create a team for a hackathon event
router.post("/:eventId", auth, async (req, res) => {
  try {
    const { teamName } = req.body;
    if (!teamName || !teamName.trim()) {
      return res.status(400).json({ msg: "Team name is required" });
    }

    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ msg: "Event not found" });
    if (event.eventType !== "hackathon") {
      return res.status(400).json({ msg: "Teams are only for hackathon events" });
    }

    // Check if user is already in a team for this event
    const existing = await Team.findOne({
      event: event._id,
      $or: [{ leader: req.user.id }, { members: req.user.id }],
    });
    if (existing) {
      return res.status(400).json({ msg: "You are already in a team for this event" });
    }

    const joinCode = generateJoinCode();

    const team = new Team({
      event: event._id,
      name: teamName.trim(),
      leader: req.user.id,
      members: [req.user.id], // leader is also a member
      joinCode,
    });

    await team.save();
    await team.populate("members", "firstName lastName email");

    res.status(201).json({ msg: "Team created!", team });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ msg: "Team name or code already exists. Try again." });
    }
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// POST /api/teams/join — join a team using a join code
router.post("/join", auth, async (req, res) => {
  try {
    const { joinCode } = req.body;
    if (!joinCode) return res.status(400).json({ msg: "Join code is required" });

    const team = await Team.findOne({ joinCode: joinCode.toUpperCase() });
    if (!team) return res.status(404).json({ msg: "Invalid join code" });

    if (team.isLocked) {
      return res.status(400).json({ msg: "This team is locked and not accepting new members" });
    }

    const event = await Event.findById(team.event);
    if (!event) return res.status(404).json({ msg: "Event not found" });

    // Check if user is already in a team for this event
    const existing = await Team.findOne({
      event: team.event,
      $or: [{ leader: req.user.id }, { members: req.user.id }],
    });
    if (existing) {
      return res.status(400).json({ msg: "You are already in a team for this event" });
    }

    // Check max team size
    if (team.members.length >= event.maxTeamSize) {
      return res.status(400).json({ msg: `Team is full (max ${event.maxTeamSize} members)` });
    }

    team.members.push(req.user.id);
    await team.save();
    await team.populate("members", "firstName lastName email");

    res.json({ msg: "Joined team successfully!", team });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/teams/my/:eventId — get my team for a specific event
router.get("/my/:eventId", auth, async (req, res) => {
  try {
    const team = await Team.findOne({
      event: req.params.eventId,
      members: req.user.id,
    }).populate("members", "firstName lastName email")
      .populate("leader", "firstName lastName email");

    if (!team) return res.json(null);
    res.json(team);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// PUT /api/teams/:teamId/lock — leader locks the team (finalizes it)
router.put("/:teamId/lock", auth, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ msg: "Team not found" });

    if (team.leader.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Only the team leader can lock the team" });
    }

    const event = await Event.findById(team.event);
    if (!event) return res.status(404).json({ msg: "Event not found" });

    if (team.members.length < event.minTeamSize) {
      return res.status(400).json({
        msg: `Need at least ${event.minTeamSize} members to lock the team (currently ${team.members.length})`,
      });
    }

    team.isLocked = true;
    await team.save();

    // Auto-register all team members for the event
    const teamMembers = team.members;
    for (const memberId of teamMembers) {
      // Check if already registered
      const existingReg = await Registration.findOne({
        event: event._id,
        participant: memberId,
        status: { $ne: "cancelled" },
      });

      if (!existingReg) {
        const ticketId = "TKT-" + crypto.randomBytes(6).toString("hex").toUpperCase();
        await Registration.create({
          event: event._id,
          participant: memberId,
          ticketId,
          status: "confirmed",
          teamName: team.name,
        });
      }
    }

    res.json({ msg: "Team locked and all members registered!", team });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// PUT /api/teams/:teamId/leave — leave a team (non-leader only, before lock)
router.put("/:teamId/leave", auth, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ msg: "Team not found" });

    if (team.isLocked) {
      return res.status(400).json({ msg: "Cannot leave a locked team" });
    }

    if (team.leader.toString() === req.user.id) {
      return res.status(400).json({ msg: "Team leader cannot leave. Delete the team instead." });
    }

    team.members = team.members.filter((m) => m.toString() !== req.user.id);
    await team.save();
    await team.populate("members", "firstName lastName email");

    res.json({ msg: "Left the team", team });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// DELETE /api/teams/:teamId — delete team (leader only, before lock)
router.delete("/:teamId", auth, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ msg: "Team not found" });

    if (team.leader.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Only the team leader can delete the team" });
    }

    if (team.isLocked) {
      return res.status(400).json({ msg: "Cannot delete a locked team" });
    }

    await Team.findByIdAndDelete(team._id);
    res.json({ msg: "Team deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/teams/event/:eventId — organizer gets all teams for an event
router.get("/event/:eventId", auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ msg: "Event not found" });
    if (event.organizer.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not your event" });
    }

    const teams = await Team.find({ event: req.params.eventId })
      .populate("members", "firstName lastName email")
      .populate("leader", "firstName lastName email")
      .sort({ createdAt: -1 });

    res.json(teams);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
