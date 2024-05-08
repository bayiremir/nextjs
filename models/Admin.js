const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  isAdmin: { type: Boolean, default: true },
});

module.exports = mongoose.model("Admin", adminSchema);
