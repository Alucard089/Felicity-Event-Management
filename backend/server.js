const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const preferencesRoutes = require("./routes/preferences");
const eventRoutes = require("./routes/events");
const registrationRoutes = require("./routes/registrations");
const feedbackRoutes = require("./routes/feedback");
const discussionRoutes = require("./routes/discussions");
const teamRoutes = require("./routes/teams");

const app = express();
const server = http.createServer(app);

// Middleware
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, "http://localhost:5173"]
  : ["http://localhost:5173"];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(null, true); // Allow all in dev
  },
  credentials: true,
}));
app.use(express.json({ limit: "10mb" })); // increased limit for payment proof images

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
});

// Make io accessible to routes via req.app.get("io")
app.set("io", io);

// Socket.io connection handling
io.on("connection", (socket) => {
  // Join an event's discussion room
  socket.on("join_event", (eventId) => {
    socket.join(`event_${eventId}`);
  });

  // Leave an event's discussion room
  socket.on("leave_event", (eventId) => {
    socket.leave(`event_${eventId}`);
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/preferences", preferencesRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/registrations", registrationRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/discussions", discussionRoutes);
app.use("/api/teams", teamRoutes);

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.log(err));
