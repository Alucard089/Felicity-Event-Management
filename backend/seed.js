// Run once to create the admin account:  node seed.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const User = require("./models/User");

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);

  const existing = await User.findOne({ role: "admin" });
  if (existing) {
    console.log("Admin already exists:", existing.email);
    process.exit(0);
  }

  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash("admin123", salt);

  const admin = new User({
    name: "Admin",
    email: "admin@felicity.iiit.ac.in",
    password: hashed,
    role: "admin",
    isIIIT: true,
  });

  await admin.save();
  console.log("Admin account created — email: admin@felicity.iiit.ac.in / password: admin123");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
