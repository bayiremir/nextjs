const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  eventId: { type: String, required: true },
  title: { type: String, required: true },
  image: { type: String },
  created_at: { type: Date },
  updated_at: { type: Date },
  spot: { type: String },
  event_infos: [
    {
      start_date: { type: Date },
      end_date: { type: Date },
      event_persons: { type: String },
      event_url: { type: String },
    },
  ],
  eventName: { type: String },
  description: { type: String },
  location: { type: String },
  attending: [
    {
      name: { type: String, required: false },
      username: { type: String, required: false },
      picture: { type: String, required: false },
    },
  ],
});

module.exports = mongoose.model("Event", eventSchema);
