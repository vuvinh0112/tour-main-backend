const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const imageSchema = new Schema(
  {
    tourId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tour",
      require: true,
    },
    url: { type: String, require: true },
  },
  {
    timestamps: true, // add createdAt and updatedAt fields
  }
);
module.exports = mongoose.models.Image || mongoose.model("Image", imageSchema);
