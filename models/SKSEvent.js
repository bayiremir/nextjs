const mongoose = require("mongoose");

const sksEventSchema = new mongoose.Schema({
  category_name: { type: String, required: true },
  created_at: { type: Date },
  event_infos: [
    {
      start_date: { type: Date },
      end_date: { type: Date },
      event_persons: { type: String },
      event_url: { type: String },
    },
  ],
  id: { type: String, required: true },
  image: { type: String },
  lang: { type: String },
  slug: { type: String },
  spot: { type: String },
  staff: [
    {
      name: { type: String },
      role: { type: String },
    },
  ],
  title: { type: String, required: true },
  updated_at: { type: Date },
});

module.exports = mongoose.model("SKSEvent", sksEventSchema);
