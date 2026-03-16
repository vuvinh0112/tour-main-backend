const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { USER_ROLES, USER_ROLE_VALUES } = require("../constants/userRole.js");

const userSchema = new Schema(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    role: {
      type: Number,
      enum: USER_ROLE_VALUES,
      default: USER_ROLES.USER,
    },
    dob: { type: Date },
    address: { type: String },
    status: { type: Boolean, default: true },
  },
  {
    timestamps: true, // add createdAt and updatedAt fields
  }
);
module.exports = mongoose.models.User || mongoose.model("User", userSchema);
