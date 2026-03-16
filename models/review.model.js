const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const reviewSchema = new Schema(
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
    rating: { type: Number },
    comment: { type: String },
  },
  {
    timestamps: true, // add createdAt and updatedAt fields
  }
);
module.exports =
  mongoose.models.Review || mongoose.model("Review", reviewSchema);
