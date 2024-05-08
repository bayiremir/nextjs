const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  clubs: [
    {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "Club" },
      name: { type: String, required: true },
      picture: { type: String, required: false },
    },
  ],
  events: [
    {
      sksid: { type: String },
      title: { type: String },
      image: { type: String },
      created_at: { type: Date },
      updated_at: { type: Date },
      slug: { type: String },
      lang: { type: String },
      spot: { type: String },
      created_at: { type: Date, default: Date.now, required: true },
      event_infos: [
        {
          start_date: { type: Date },
          end_date: { type: Date },
          event_persons: { type: String },
          event_url: { type: String },
        },
      ],
    },
  ],
  isAdmin: { type: Boolean, required: true, default: false },
  presidentOf: [
    {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "Club" },
      name: { type: String, required: true },
      picture: { type: String, required: false },
    },
  ],
  invitations: [
    {
      clubId: { type: mongoose.Schema.Types.ObjectId, ref: "Club" },
      clubName: { type: String, required: true },
      clubPicture: { type: String, required: false },
    },
  ],
  evaluations: [
    {
      eventId: { type: String },
      eventName: { type: String, required: true },
      content: { type: String, required: true },
      rating: { type: Number, required: true, min: 1, max: 5 },
      createdAt: { type: Date, default: Date.now },
    },
  ],
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 8);
  next();
});

userSchema.methods.isValidPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("User", userSchema);
