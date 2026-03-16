const BookingRq = require("../models/bookingRq.model.js");
const User = require("../models/user.model.js");
const { USER_ROLES } = require("../constants/userRole.js");
const { BOOKING_RQ_STATUS } = require("../constants/bookingRqStatus.js");
const { TOUR_STATUS } = require("../constants/tourStatus.js");
const Tour = require("../models/tour.model.js");

const createBookingRq = async (req, res) => {
  const userId = req.userId;

  if (!userId) {
    return res.status(404).json({ message: "User not found" });
  }

  const tourId = req.params.tourId;
  if (!tourId) {
    return res.status(404).json({ message: "Tour not found" });
  }
  const tour = await Tour.findById(tourId);
  if (
    tour.status === TOUR_STATUS.CANCELLED ||
    tour.status === TOUR_STATUS.COMPLETED
  ) {
    return res.status(400).json({
      error: true,
      message: "Tour is not available for booking",
    });
  }

  const { quantity } = req.body;
  if (!quantity) {
    return res
      .status(400)
      .json({ error: true, message: "Please fill all the fields" });
  }

  try {
    const bookingRq = new BookingRq({
      userId,
      tourId,
      quantity,
    });

    const newBookingRq = await bookingRq.save();

    if (!newBookingRq) {
      return res
        .status(400)
        .json({ error: true, message: "BookingRq not created" });
    }

    return res.status(200).json({
      error: false,
      message: "BookingRq created successfully",
      data: newBookingRq,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: true, message: error.message });
  }
};

// get bookingRq by Role
const getBookingRqs = async (req, res) => {
  const userId = req.userId;
  console.log("userId", userId);

  try {
    let bookingRqs;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    switch (user.role) {
      case USER_ROLES.ADMIN:
        bookingRqs = await BookingRq.find()
          .populate("tourId")
          .populate("userId", "fullName phone email")
          .populate("sellerId", "fullName phone email");
        break;

      case USER_ROLES.USER || USER_ROLES.TOUR_GUIDE:
        bookingRqs = await BookingRq.find({ userId })
          .populate("tourId")
          .populate("sellerId", "fullName phone email");
        break;

      case USER_ROLES.SELLER:
        bookingRqs = await BookingRq.find({ sellerId: userId })
          .populate("tourId")
          .populate("userId", "fullName phone email")
          .populate("sellerId", "fullName phone email");
        break;

      default:
        return res.status(401).json({ message: "Not permission" });
    }

    if (!bookingRqs) {
      return res
        .status(400)
        .json({ error: true, message: "BookingRq not found" });
    }

    return res.status(200).json({
      error: false,
      message: "BookingRq found successfully",
      data: bookingRqs,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: true, message: error.message });
  }
};

const getBookingRqsById = async (req, res) => {
  const bookingRqId = req.params.bookingRqId;
  try {
    const userId = req.userId;
    const user = await User.findById(userId);

    const bookingRqs = await BookingRq.findById(bookingRqId)
      .populate("tourId")
      .populate("userId", "fullName phone email")
      .populate("sellerId", "fullName phone email");
    if (!bookingRqs) {
      return res
        .status(400)
        .json({ error: true, message: "BookingRq not found" });
    }
    return res.status(200).json({
      error: false,
      message: "BookingRq found successfully",
      data: bookingRqs,
      role: user.role,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: true, message: error.message });
  }
};

// phaan cong sellerId cho bookingRq
const updateSellerBookingRq = async (req, res) => {
  const bookingRqId = req.params.bookingRqId;
  const userId = req.userId;

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  if (user.role !== USER_ROLES.ADMIN)
    return res.status(401).json({ message: "Not permission" });

  const booking = await BookingRq.findById(bookingRqId);
  if (!booking) return res.status(404).json({ message: "BookingRq not found" });

  if (booking.status >= BOOKING_RQ_STATUS.PAID)
    return res
      .status(400)
      .json({ message: "Cannot update seller for this booking" });

  const sellerId = req.body.sellerId;
  if (!sellerId)
    return res.status(400).json({ message: "Don't have sellerId !" });

  const seller = await User.findOne({ _id: sellerId, role: USER_ROLES.SELLER });
  if (!seller) return res.status(404).json({ message: "Seller not found" });

  await BookingRq.findByIdAndUpdate(bookingRqId, {
    sellerId,
    status: BOOKING_RQ_STATUS.ASSIGNED,
  });

  return res.status(200).json({
    error: false,
    message: "BookingRq assigned to seller successfully",
  });
};

const updateQuantityBookingRq = async (req, res) => {
  const bookingRqId = req.params.bookingRqId;
  const userId = req.userId;
  const { quantity } = req.body;

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  const booking = await BookingRq.findById(bookingRqId);
  if (!booking) return res.status(404).json({ message: "BookingRq not found" });

  if (booking.status >= BOOKING_RQ_STATUS.PAID)
    return res
      .status(400)
      .json({ message: "Cannot update quantity for this booking" });

  // Phân quyền
  if (user.role === USER_ROLES.USER && booking.userId.toString() !== userId)
    return res.status(401).json({ message: "Not permission" });

  if (user.role === USER_ROLES.SELLER && booking.sellerId.toString() !== userId)
    return res.status(401).json({ message: "Not permission" });

  // Update
  booking.quantity = quantity;
  await booking.save();

  return res.status(200).json({
    error: false,
    message: "BookingRq quantity updated successfully",
  });
};

// seller update status bookingRq
const updateStatusBookingRq = async (req, res) => {
  const bookingRqId = req.params.bookingRqId;
  const userId = req.userId;

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (user.role !== USER_ROLES.SELLER) {
    return res.status(401).json({ message: "Not permission" });
  }

  if (!bookingRqId) {
    return res.status(404).json({ message: "BookingRq not found" });
  }
  try {
    const status = Number(req.body.status);

    // nếu status không hợp lệ thì trả về lỗi
    if (
      !status ||
      (status != BOOKING_RQ_STATUS.PAID &&
        status != BOOKING_RQ_STATUS.CANCELLED)
    ) {
      return res.status(400).json({ message: "Status is invalid" });
    }

    // Hợp lệ thì cập nhật theo cái gửi đến
    await BookingRq.findByIdAndUpdate(bookingRqId, {
      status,
    });

    if (status === BOOKING_RQ_STATUS.PAID) {
      const booking = await BookingRq.findById(bookingRqId);
      if (!booking) {
        return res.status(404).json({ message: "BookingRq not found" });
      }

      // Kiểm tra số lượng còn trống
      const tour = await Tour.findById(booking.tourId);
      if (!tour) {
        return res.status(404).json({ message: "Tour not found" });
      }

      if (tour.current + booking.quantity > tour.max) {
        return res.status(400).json({ message: "Not enough slots available" });
      }

      // Cập nhật số lượng và thêm userId vào userIds
      await Tour.findByIdAndUpdate(booking.tourId, {
        $push: {
          userIds: { userId: booking.userId, quantity: booking.quantity },
        },
        $inc: { current: booking.quantity },
      });
    }

    return res.status(200).json({
      error: false,
      message: "BookingRq updated successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: true, message: error.message });
  }
};

module.exports = {
  createBookingRq,
  getBookingRqs,
  updateSellerBookingRq,
  updateStatusBookingRq,
  getBookingRqsById,
  updateQuantityBookingRq,
};
