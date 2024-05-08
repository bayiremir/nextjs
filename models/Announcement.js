const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  date: { type: Date, default: Date.now },
  link: { type: String },
  updatedDate: { type: Date },
  club: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Club",
  },
  isApproved: { type: Boolean, default: false },
  visibility: { type: String, enum: ["all", "club"] }, // corrected here
});

module.exports = mongoose.model("Announcement", announcementSchema);
