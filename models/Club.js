const mongoose = require("mongoose");

const clubSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  baslik: { type: String, required: true, unique: true },
  resim: { type: String },
  isPresident: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  members: [
    {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      name: { type: String, required: true },
      picture: { type: String, required: false },
    },
  ],
  announcements: [
    { type: mongoose.Schema.Types.ObjectId, ref: "Announcement" },
  ],
  points: { type: Number, default: 0, required: true },
});

module.exports = mongoose.model("Club", clubSchema);
