const mongoose = require("mongoose");

const evaluationSchema = new mongoose.Schema({
  eventId: { type: String },
  eventName: { type: String, required: true },
  user: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      username: { type: String, required: true },
    },
  ],
  content: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comments: { type: String, required: false },
  informed: { type: String, required: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Evaluation", evaluationSchema);
