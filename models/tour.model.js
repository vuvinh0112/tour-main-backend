const mongoose = require("mongoose");
const {
  TOUR_STATUS_VALUES,
  TOUR_STATUS,
} = require("../constants/tourStatus.js");
const { TOUR_CATEGORY_VALUES } = require("../constants/tourCategory.js");
const Schema = mongoose.Schema;

const tourSchema = new Schema(
  {
    title: { type: String, required: true },
    price: { type: Number, required: true },
    detail: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    max: { type: Number, required: true },
    current: { type: Number, default: 0 },
    category: { type: Number, enum: TOUR_CATEGORY_VALUES, required: true },
    status: {
      type: Number,
      enum: TOUR_STATUS_VALUES,
      default: TOUR_STATUS.PENDING,
    },
    tourGuideId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    userIds: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        quantity: Number,
      },
    ],
    city: { type: String, required: true },

    reviewCount: {
      type: Number,
      default: 0,
    },
    avgRating: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.Tour || mongoose.model("Tour", tourSchema);
