const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const tourRpSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      require: true,
    },
    tourId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tour",
      require: true,
    },
    report: { type: String },
  },
  {
    timestamps: true, // add createdAt and updatedAt fields
  }
);
module.exports =
  mongoose.models.TourRp || mongoose.model("TourRp", tourRpSchema);
