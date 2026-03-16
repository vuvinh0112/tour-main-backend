const express = require("express");

const authMiddleware = require("../middleware/auth");
const {
  createBookingRq,
  getBookingRqs,
  updateSellerBookingRq,
  updateStatusBookingRq,
  getBookingRqsById,
  updateQuantityBookingRq,
} = require("../controllers/bookingRq-controller.js");

const bookingRqRouter = express.Router();

bookingRqRouter.post("/create/:tourId", authMiddleware, createBookingRq);
bookingRqRouter.get("/", authMiddleware, getBookingRqs);
bookingRqRouter.post(
  "/update/:bookingRqId",
  authMiddleware,
  updateSellerBookingRq
);
bookingRqRouter.post(
  "/update-status/:bookingRqId",
  authMiddleware,
  updateStatusBookingRq
);
bookingRqRouter.get(
  "/getBooking/:bookingRqId",
  authMiddleware,
  getBookingRqsById
);
bookingRqRouter.post(
  "/updateQuantityBookingRq/:bookingRqId",
  authMiddleware,
  updateQuantityBookingRq
);

module.exports = bookingRqRouter;
