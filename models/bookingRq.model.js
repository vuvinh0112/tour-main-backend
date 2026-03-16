const mongoose = require("mongoose");

const {
  BOOKING_RQ_STATUS_VALUES,
  BOOKING_RQ_STATUS,
} = require("../constants/bookingRqStatus.js");
const Schema = mongoose.Schema;

const bookingRqSchema = new Schema(
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
    quantity: {
      type: Number,
      require: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    expiredAt: {
      type: Date,
      default: () => new Date(Date.now() + 72 * 60 * 60 * 1000),
    },
    status: {
      type: Number,
      enum: BOOKING_RQ_STATUS_VALUES,
      default: BOOKING_RQ_STATUS.PENDING,
    },
  },
  {
    timestamps: true, // add createdAt and updatedAt fields
  }
);
module.exports =
  mongoose.models.BookingRq || mongoose.model("BookingRq", bookingRqSchema);
