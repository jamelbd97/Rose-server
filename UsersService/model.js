const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    email: { type: String },
    password: { type: String },
    firstname: { type: String },
    lastname: { type: String },
    birthdate: { type: Date },
    gender: { type: String },
    pictureId: { type: String },
    isVerified: { type: Boolean },
    role: { type: String },
  },
  {
    timestamps: { currentTime: () => Date.now() },
  }
);
module.exports = mongoose.model("User", UserSchema);
