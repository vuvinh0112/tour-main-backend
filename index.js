require("dotenv").config();
const express = require("express");
const cors = require("cors");

const config = require("./config.json");
const connectDB = require('./db.js');

const userRouter = require("./routes/user-route.js");
const tourRouter = require("./routes/tour-route.js");
const bookingRqRouter = require("./routes/bookingRq-route.js");
const cron = require("node-cron");
const Tour = require("./models/tour.model.js");
const { TOUR_STATUS } = require("./constants/tourStatus.js");

const app = express();
const port = process.env.PORT || 3000;

//middleware
app.use(express.json());
app.use(cors({ origin: "*" }));

// connect to db
connectDB();

// API endpoints
app.use("/api/user", userRouter);
app.use("/api/tour", tourRouter);
app.use("/api/bookingRq", bookingRqRouter);

//
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// Schedule a cron job to update tour statuses every day at midnight
//dev thì chạy 1 lần
cron.schedule("0 0 * * *", async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Cài đặt giờ, phút, giây về 0

    const result = await Tour.updateMany(
      { startDate: { $lte: today }, status: TOUR_STATUS.ASSIGNED },
      { $set: { status: TOUR_STATUS.IN_PROGRESS } }
    );

    console.log("Update result:", result);
    console.log(
      `[CRON] Updated tour statuses at ${new Date().toLocaleString()}`
    );
  } catch (error) {
    console.error("[CRON] Failed to update tour statuses:", error);
  }
});

module.exports = app;
