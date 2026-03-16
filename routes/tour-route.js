const express = require("express");
const {
  createTour,
  getTours,
  getTourById,
  updateTour,
  deleteTour,
  updateTourguide,
  getToursByRole,
  updateTourStatus,
  createReport,
  createReview,
  getReports,
  getReviews,
  suggestTours,
  getMyTourDetailByRole,
  cancelTour,
  getTourStatistics,
} = require("../controllers/tour-controller.js");
const authMiddleware = require("../middleware/auth");
const { uploadTourMiddleware } = require("../middleware/uploadimg.js");
const tourRouter = express.Router();

tourRouter.post(
  "/create-tour",
  authMiddleware,
  uploadTourMiddleware,
  createTour
);
tourRouter.get("/", getTours);
tourRouter.post(
  "/update/:tourId",
  authMiddleware,
  uploadTourMiddleware,
  updateTour
);
tourRouter.delete("/delete/:tourId", authMiddleware, deleteTour);
tourRouter.post("/update-tour_guide/:tourId", authMiddleware, updateTourguide);
tourRouter.get("/myTours", authMiddleware, getToursByRole);
tourRouter.get("/myTours/:tourId", authMiddleware, getMyTourDetailByRole);
tourRouter.post("/update-status/:tourId", authMiddleware, updateTourStatus);
tourRouter.post("/createReport/:tourId", authMiddleware, createReport);
tourRouter.post("/createReview/:tourId", authMiddleware, createReview);
tourRouter.get("/report/:tourId", authMiddleware, getReports);
tourRouter.get("/review/:tourId", getReviews);
tourRouter.post("/suggestTours", suggestTours);
tourRouter.post("/cancelTour/:tourId", authMiddleware, cancelTour);
tourRouter.get("/statistics", getTourStatistics);

tourRouter.get("/:id", getTourById);

module.exports = tourRouter;
