const multer = require("multer");
const cloudinary = require("../lib/cloudinary.js");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const Tour = require("../models/tour.model.js");
const User = require("../models/user.model.js");
const Image = require("../models/image.model.js");
const { USER_ROLES } = require("../constants/userRole.js");
const { TOUR_STATUS } = require("../constants/tourStatus.js");
const { TOUR_CATEGORY } = require("../constants/tourCategory.js");
const { BOOKING_RQ_STATUS } = require("../constants/bookingRqStatus.js");
const TourRp = require("../models/tourRp.model.js");
const Review = require("../models/review.model.js");
const BookingRq = require("../models/bookingRq.model.js");
// create tour
const createTour = async (req, res) => {
  const id = req.userId;

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  if (user.role != USER_ROLES.ADMIN) {
    return res.status(401).json({ message: "Not permission" });
  }

  const { title, detail, category, startDate, endDate, price, max, city } =
    req.body; // add image nữa

  if (
    !title ||
    !detail ||
    !category ||
    !startDate ||
    !endDate ||
    !max ||
    !price ||
    !city
  ) {
    return res
      .status(400)
      .json({ error: true, message: "Please fill all the fields" });
  }

  try {
    const tour = new Tour({
      title,
      detail,
      category,
      price,
      city,
      startDate,
      endDate,
      max,
    });

    const newTour = await tour.save();

    if (!newTour) {
      return res.status(400).json({ error: true, message: "Tour not created" });
    }

    // Lưu ảnh vào Cloudinary
    const files = req.files;

    if (files && files.length > 0) {
      const uploadedUrls = await Promise.all(
        files.map((file) => {
          return new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder: "tour_images" },
              (err, result) => {
                if (err) {
                  return reject(err);
                }
                console.log(result.secure_url);
                resolve(result.secure_url);
              },
            );
            stream.end(file.buffer);
          });
        }),
      );

      const imageDocs = uploadedUrls.map((url) => ({
        url,
        tourId: newTour._id,
      }));

      await Image.insertMany(imageDocs);
    }

    res
      .status(201)
      .json({ error: false, message: "Tour created successfully" });
  } catch (error) {
    res.status(400).json({ error: true, message: error.message });
  }
};

//get all tours
const getTours = async (req, res) => {
  try {
    const tours = await Tour.find({ status: { $ne: TOUR_STATUS.CANCELLED } });

    const toursWithImages = await Promise.all(
      tours.map(async (tour) => {
        let imageUrls = [];

        const images = await Image.find({ tourId: tour._id });
        if (images.length > 0) {
          imageUrls = images.map((image) => image.url);
        }

        // Map dữ liệu theo format bạn mong muốn
        return {
          id: tour._id,
          title: tour.title,
          price: tour.price,
          desc: tour.detail, // nếu trong DB là 'detail' thì map sang 'desc'
          image: imageUrls,
          startDate: tour.startDate,
          endDate: tour.endDate,
          max: tour.max,
          current: tour.current,
          category: tour.category,
          city: tour.city,
          reviewCount: tour.reviewCount,
          avgRating: tour.avgRating,
          status: tour.status,
        };
      }),
    );

    return res.json({
      error: false,
      data: toursWithImages,
    });
  } catch (error) {
    console.log("get-tour: ", error);
    res.status(500).json({ error: true, message: "Internal server error" });
  }
};

const getTourById = async (req, res) => {
  try {
    const id = req.params.id;

    // Chuyển id sang ObjectId (nếu hợp lệ)
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    const objectId = new mongoose.Types.ObjectId(id);

    const tour = await Tour.findById(objectId);

    if (!tour) {
      return res.status(404).json({ message: "Tour not found" });
    }

    // Dùng objectId để query images thay vì string id
    const images = await Image.find({ tourId: objectId });

    res.status(200).json({
      ...tour.toObject(),
      images,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getToursByRole = async (req, res) => {
  const userId = req.userId;

  try {
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const currentUser = await User.findById(userId);
    if (!currentUser)
      return res.status(404).json({ message: "User not found" });

    let tours = [];

    if (currentUser.role === USER_ROLES.TOUR_GUIDE) {
      tours = await Tour.find({ tourGuideId: userId });
    } else if (currentUser.role === USER_ROLES.ADMIN) {
      tours = await Tour.find({ current: { $gt: 0 } });
    } else if (currentUser.role === USER_ROLES.USER) {
      tours = await Tour.find({ "userIds.userId": userId });
    } else {
      // Nếu role không khớp gì thì coi như USER
      tours = await Tour.find({ "userIds.userId": userId });
    }

    const tourList = await Promise.all(
      tours.map(async (tour) => {
        const image = await Image.findOne({ tourId: tour._id });
        let myQuantity = 0;
        if (currentUser.role === USER_ROLES.USER) {
          const myBooking = tour.userIds.find(
            (item) => item.userId && item.userId.toString() === userId,
          );
          myQuantity = myBooking ? myBooking.quantity : 0;
        }
        return {
          _id: tour._id,
          title: tour.title,
          startDate: tour.startDate,
          endDate: tour.endDate,
          price: tour.price,
          current: tour.current,
          max: tour.max,
          category: tour.category,
          imageUrl: image ? image.url : null,
          myQuantity:
            currentUser.role === USER_ROLES.USER ? myQuantity : undefined,
        };
      }),
    );

    res.status(200).json({ error: false, data: tourList });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
};

const getMyTourDetailByRole = async (req, res) => {
  const userId = req.userId;
  const tourId = req.params.tourId;

  try {
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const currentUser = await User.findById(userId);
    if (!currentUser)
      return res.status(404).json({ message: "User not found" });

    const tour = await Tour.findById(tourId)
      .populate("userIds.userId", "fullName phone")
      .populate("tourGuideId", "fullName phone");
    if (!tour) return res.status(404).json({ message: "Tour not found" });

    const image = await Image.findOne({ tourId: tour._id });

    const result = {
      ...tour.toObject(),
      imageUrl: image ? image.url : null,
      roleUser: currentUser.role,
    };

    res.status(200).json({ error: false, data: result });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
};

const updateTour = async (req, res) => {
  const id = req.userId;

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  if (user.role !== USER_ROLES.ADMIN) {
    return res.status(401).json({ message: "Not permission" });
  }

  const { title, detail, category, startDate, price, endDate, max } = req.body;

  const tourId = req.params.tourId;
  try {
    const tour = await Tour.findByIdAndUpdate(tourId, {
      title,
      detail,
      category,
      startDate,
      price,
      endDate,
      max,
    });

    if (!tour) {
      return res.status(404).json({ error: true, message: "Tour not found" });
    }

    const files = req.files;

    if (files && files.length > 0) {
      // 1. Lấy ảnh cũ
      const oldImages = await Image.find({ tourId });

      // 2. Xoá ảnh cũ khỏi Cloudinary
      await Promise.all(
        oldImages.map(async (img) => {
          // Extract public ID from the URL
          const publicId = img.url.split("/").slice(-1)[0].split(".")[0];

          return cloudinary.uploader.destroy(`tour_images/${publicId}`);
        }),
      );

      // 3. Xoá ảnh cũ khỏi DB
      await Image.deleteMany({ tourId });

      // 4. Upload ảnh mới
      const uploadedUrls = await Promise.all(
        files.map((file) => {
          return new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder: "tour_images" },
              (err, result) => {
                if (err) return reject(err);
                resolve(result.secure_url);
              },
            );
            stream.end(file.buffer);
          });
        }),
      );

      const imageDocs = uploadedUrls.map((url) => ({
        url,
        tourId: tour._id,
      }));

      await Image.insertMany(imageDocs);
    }

    res
      .status(200)
      .json({ error: false, message: "Tour updated successfully" });
  } catch (error) {
    res.status(400).json({ error: true, message: error.message });
  }
};

const deleteTour = async (req, res) => {
  const id = req.userId;

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  if (user.role !== USER_ROLES.ADMIN) {
    return res.status(401).json({ message: "Not permission" });
  }

  const tourId = req.params.tourId;
  const tour = await Tour.findById(tourId);

  // 1. Lấy ảnh cũ
  const oldImages = await Image.find({ tourId });

  // 2. Xoá ảnh cũ khỏi Cloudinary
  await Promise.all(
    oldImages.map(async (img) => {
      // Extract public ID from the URL
      const publicId = img.url.split("/").slice(-1)[0].split(".")[0];

      return cloudinary.uploader.destroy(`tour_images/${publicId}`);
    }),
  );

  // 3. Xoá ảnh cũ khỏi DB
  await Image.deleteMany({ tourId });

  await Tour.findByIdAndDelete(tourId);

  await BookingRq.deleteMany({ tourId });
  await TourRp.deleteMany({ tourId });
  await Review.deleteMany({ tourId });
  if (!tour) {
    return res.status(404).json({ error: true, message: "Tour not found" });
  }
  res.status(200).json({ error: false, message: "Tour deleted successfully" });
};

// phaan cong tourguide cho tour
const updateTourguide = async (req, res) => {
  const tourId = req.params.tourId;
  const userId = req.userId;

  try {
    // Check user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ Cho phép ADMIN (0) và SELLER (2)
    if (user.role !== USER_ROLES.ADMIN && user.role !== USER_ROLES.SELLER) {
      return res.status(403).json({ message: "Not permission" });
    }

    // Check tour
    const tour = await Tour.findById(tourId);
    if (!tour) {
      return res.status(404).json({ message: "Tour not found" });
    }

    const guideId = req.body.tourGuideId;
    if (!guideId) {
      return res
        .status(400)
        .json({ message: "Missing tourGuideId in request body!" });
    }

    // Check guide
    const guide = await User.findOne({
      _id: guideId,
      role: USER_ROLES.TOUR_GUIDE,
    });

    if (!guide) {
      return res.status(404).json({ message: "Tour guide not found" });
    }

    // Check conflict
    const conflictingTour = await Tour.findOne({
      tourGuideId: guideId,
      _id: { $ne: tourId },
      startDate: { $lte: tour.endDate },
      endDate: { $gte: tour.startDate },
      status: { $ne: TOUR_STATUS.CANCELLED },
    });

    if (conflictingTour) {
      return res.status(400).json({
        message: `Tour guide is already assigned to another tour (ID: ${conflictingTour._id})`,
      });
    }

    // ✅ Update + return luôn dữ liệu mới
    const updatedTour = await Tour.findByIdAndUpdate(
      tourId,
      {
        tourGuideId: guideId,
        status: TOUR_STATUS.ASSIGNED,
      },
      { new: true },
    ).populate("tourGuideId", "fullName phone email");

    return res.status(200).json({
      error: false,
      message: "Tour assigned to guide successfully",
      data: updatedTour, // 🔥 QUAN TRỌNG
    });
  } catch (error) {
    console.log("updateTourguide error: ", error);
    return res.status(500).json({
      error: true,
      message: "Internal server error",
    });
  }
};

// updaete tour status
const updateTourStatus = async (req, res) => {
  const tourId = req.params.tourId;
  const userId = req.userId;
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (user.role !== USER_ROLES.TOUR_GUIDE) {
    return res.status(401).json({ message: "Not permission" });
  }

  if (!tourId) {
    return res.status(404).json({ message: "Tour not found" });
  }

  const status = req.body.status;
  if (!status) {
    return res.status(400).json({ message: "Don't have status !" });
  }

  try {
    await Tour.findByIdAndUpdate(tourId, {
      status,
    });

    return res.status(200).json({
      error: false,
      message: "Tour status updated successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: true, message: error.message });
  }
};

// tạo report cho tour
const createReport = async (req, res) => {
  const tourId = req.params.tourId;
  const userId = req.userId;
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (user.role !== USER_ROLES.TOUR_GUIDE) {
    return res.status(401).json({ message: "Not permission" });
  }

  if (!tourId) {
    return res.status(404).json({ message: "Tour not found" });
  }

  const report = req.body.report;
  if (!report) {
    return res.status(400).json({ message: "Don't have report !" });
  }

  try {
    const tourRp = new TourRp({
      tourId,
      userId,
      report,
    });
    const newTourRp = await tourRp.save();
    if (!newTourRp) {
      return res
        .status(400)
        .json({ error: true, message: "Report not created" });
    }

    return res.status(200).json({
      error: false,
      message: "Tour report created successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: true, message: error.message });
  }
};

// get all report of tour
const getReports = async (req, res) => {
  const tourId = req.params.tourId;
  const userId = req.userId;
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (user.role !== USER_ROLES.ADMIN) {
    return res.status(401).json({ message: "Not permission" });
  }

  if (!tourId) {
    return res.status(404).json({ message: "Tour not found" });
  }

  try {
    const tourRp = await TourRp.find({ tourId }).populate("userId", "fullName");
    if (!tourRp) {
      return res.status(400).json({ error: true, message: "Report not found" });
    }

    return res.status(200).json({
      error: false,
      message: "Tour report found successfully",
      data: tourRp,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: true, message: error.message });
  }
};

// tạo review cho tour
const createReview = async (req, res) => {
  const tourId = req.params.tourId;
  const userId = req.userId;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const tour = await Tour.findById(tourId);
    if (!tour) {
      return res.status(404).json({ message: "Tour not found" });
    }

    const today = new Date();
    if (today < tour.endDate) {
      return res
        .status(400)
        .json({ message: "Chưa thể đánh giá khi tour chưa kết thúc" });
    }

    const hasBooking = tour.userIds.some(
      (item) => item.userId.toString() === userId,
    );
    if (!hasBooking) {
      return res.status(403).json({ message: "Bạn chưa tham gia tour này" });
    }

    const { rating, comment } = req.body;
    if (rating === undefined || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Điểm đánh giá phải từ 1-5!" });
    }

    // Check nếu user đã review rồi thì không cho review nữa (optional)
    const existedReview = await Review.findOne({ tourId, userId });
    if (existedReview) {
      return res.status(400).json({ message: "Bạn đã đánh giá tour này rồi!" });
    }

    // Tạo review mới
    const newReview = new Review({ tourId, userId, rating, comment });
    await newReview.save();

    // Tính lại reviewCount và avgRating
    const reviews = await Review.find({ tourId });
    const reviewCount = reviews.length;
    const avgRating =
      reviews.reduce((acc, cur) => acc + cur.rating, 0) / reviewCount;

    // Cập nhật Tour
    tour.reviewCount = reviewCount;
    tour.avgRating = avgRating;
    await tour.save();

    return res.status(200).json({
      error: false,
      message: "Đánh giá thành công",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: true, message: error.message });
  }
};

// get all review of tour
const getReviews = async (req, res) => {
  const tourId = req.params.tourId;

  if (!tourId) {
    return res.status(404).json({ message: "Tour not found" });
  }

  try {
    const tourRv = await Review.find({ tourId }).populate("userId", "fullName");

    return res.status(200).json({
      error: false,
      message: "Tour review found successfully",
      data: tourRv,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: true, message: error.message });
  }
};

const NodeGeocoder = require("node-geocoder");
const haversine = require("haversine-distance");

const geocoder = NodeGeocoder({ provider: "openstreetmap" });

// Load file JSON một lần khi khởi động app
const provincesLatLngPath = path.join(
  __dirname,
  "..",
  "data",
  "vietnam-provinces-latlng.json",
);
let provincesLatLng = {};
try {
  provincesLatLng = JSON.parse(fs.readFileSync(provincesLatLngPath, "utf8"));
  console.log("Load tọa độ tỉnh/thành từ file JSON thành công.");
} catch (err) {
  console.error("Lỗi đọc file JSON tọa độ tỉnh/thành:", err);
}

const getCoordinates = async (city) => {
  if (!city || city.trim() === "") {
    console.error("getCoordinates bị lỗi: city không hợp lệ:", city);
    return null;
  }

  const cityTrim = city.trim();

  // Tìm trong file JSON trước
  if (provincesLatLng[cityTrim]) {
    return {
      lat: provincesLatLng[cityTrim].latitude,
      lon: provincesLatLng[cityTrim].longitude,
    };
  }

  // Nếu không có trong JSON, mới gọi API
  try {
    const res = await geocoder.geocode(cityTrim);
    if (!res.length) return null;

    const vnResults = res.filter(
      (r) => r.countryCode === "vn" || r.country_code === "vn",
    );
    if (vnResults.length > 0) {
      return { lat: vnResults[0].latitude, lon: vnResults[0].longitude };
    }
    return { lat: res[0].latitude, lon: res[0].longitude };
  } catch (error) {
    console.error("Lỗi geocode (chi tiết):", error);
    return null;
  }
};

const categorySimilarityMatrix = [
  [1, 0.8, 0.6, 0.4, 0.7], //FOOD_TOUR
  [0.8, 1, 0.7, 0.5, 0.5], //RESORT_TOUR
  [0.6, 0.7, 1, 0.6, 0.5], //BEACH_TOUR
  [0.4, 0.5, 0.6, 1, 0.7], //ECO_TOURISM
  [0.7, 0.5, 0.5, 0.7, 1], //CULTURAL_TOUR
];

const suggestTours = async (req, res) => {
  try {
    const { city, people, category, price, startDate, endDate } = req.body;
    const tours = await Tour.find();
    if (!tours.length)
      return res.status(404).json({ message: "Không có tour." });

    // Tính toạ độ nếu có city
    let userCoord;
    if (city) {
      userCoord = await getCoordinates(city);
      if (!userCoord)
        return res.status(400).json({ message: "Không tìm thấy tọa độ." });
    }

    const tourCoords = await Promise.all(
      tours.map((t) => getCoordinates(t.city)),
    );

    // Tính các giá trị thô
    const peopleDiffs = people
      ? tours.map((tour) => Math.abs(tour.max - people))
      : [];
    const maxPeopleDiff = people ? Math.max(...peopleDiffs) : 1;

    const distances = city
      ? tours.map((tour, i) =>
          haversine(userCoord, tourCoords[i] || { lat: 0, lon: 0 }),
        )
      : [];
    const maxDistance = city ? Math.max(...distances) : 1;

    const pricesArr = price
      ? tours.map((tour) => Math.abs(tour.price - price))
      : [];
    const maxPrice = price ? Math.max(...pricesArr) : 1;

    const startDiffs = startDate
      ? tours.map((tour) =>
          Math.abs(new Date(tour.startDate) - new Date(startDate)),
        )
      : [];
    const maxStartDiff = startDate ? Math.max(...startDiffs) : 1;

    const endDiffs = endDate
      ? tours.map((tour) =>
          Math.abs(new Date(tour.endDate) - new Date(endDate)),
        )
      : [];
    const maxEndDiff = endDate ? Math.max(...endDiffs) : 1;

    const safeDiv = (a, b) => (b === 0 ? 1 : a / b);

    // Xác định các tiêu chí được nhập
    const activeCriteria = [];
    if (city) activeCriteria.push("distance");
    if (people) activeCriteria.push("people");
    if (category) activeCriteria.push("category");
    if (price) activeCriteria.push("price");
    if (startDate) activeCriteria.push("startDate");
    if (endDate) activeCriteria.push("endDate");

    // Tạo criteriaMatrix
    const criteriaMatrix = tours.map((tour, i) => {
      const row = [];
      if (city) row.push(safeDiv(maxDistance - distances[i], maxDistance));
      if (people) row.push(1 - safeDiv(peopleDiffs[i], maxPeopleDiff));
      if (category)
        row.push(categorySimilarityMatrix[category - 1][tour.category - 1]);
      if (price) row.push(1 - safeDiv(pricesArr[i], maxPrice));
      if (startDate) row.push(1 - safeDiv(startDiffs[i], maxStartDiff));
      if (endDate) row.push(1 - safeDiv(endDiffs[i], maxEndDiff));
      return row;
    });

    // Lấy weights từ body hoặc default
    const defaultWeights = {
      distance: 0.2,
      people: 0.1,
      category: 0.25,
      price: 0.15,
      startDate: 0.15,
      endDate: 0.15,
    };

    let weights = req.body.weights || defaultWeights;

    // Nếu không nhập tiêu chí thì weight tiêu chí đó = 0
    if (!city) weights.distance = 0;
    if (!people) weights.people = 0;
    if (!category) weights.category = 0;
    if (!price) weights.price = 0;
    if (!startDate) weights.startDate = 0;
    if (!endDate) weights.endDate = 0;

    // Tính tổng weight còn lại
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

    // Chuẩn hoá lại weights nếu tổng > 0
    if (totalWeight > 0) {
      for (let key in weights) {
        weights[key] = weights[key] / totalWeight;
      }
    }

    // Chuyển weights về theo thứ tự activeCriteria
    const wValues = activeCriteria.map((c) => weights[c]);

    // Tính best & worst
    const criteriaCount = activeCriteria.length;
    const best = Array(criteriaCount).fill(0);
    const worst = Array(criteriaCount).fill(0);

    for (let j = 0; j < criteriaCount; j++) {
      const values = criteriaMatrix.map((row) => row[j]);
      best[j] = Math.max(...values);
      worst[j] = Math.min(...values);
    }

    // Tính TOPSIS score
    const scores = criteriaMatrix.map((row) => {
      const dBest = Math.sqrt(
        row.reduce(
          (sum, val, j) => sum + wValues[j] * Math.pow(val - best[j], 2),
          0,
        ),
      );
      const dWorst = Math.sqrt(
        row.reduce(
          (sum, val, j) => sum + wValues[j] * Math.pow(val - worst[j], 2),
          0,
        ),
      );
      return dWorst / (dBest + dWorst);
    });

    // Ghép kết quả
    const result = tours.map((tour, i) => {
      const criteriaResult = {};
      let idx = 0;
      if (city) criteriaResult.distance = criteriaMatrix[i][idx++];
      if (people) criteriaResult.people = criteriaMatrix[i][idx++];
      if (category) criteriaResult.category = criteriaMatrix[i][idx++];
      if (price) criteriaResult.price = criteriaMatrix[i][idx++];
      if (startDate) criteriaResult.startDate = criteriaMatrix[i][idx++];
      if (endDate) criteriaResult.endDate = criteriaMatrix[i][idx++];

      return {
        ...tour.toObject(),
        score: scores[i],
        criteria: criteriaResult,
      };
    });

    // Lấy top 50
    const topTours = result.sort((a, b) => b.score - a.score).slice(0, 50);

    // Ghép thêm ảnh
    const topToursWithImages = await Promise.all(
      topTours.map(async (tour) => {
        const images = await Image.find({ tourId: tour._id });
        const imageUrls = images.map((img) => img.url);
        return {
          id: tour._id,
          title: tour.title,
          price: tour.price,
          desc: tour.detail,
          image: imageUrls,
          startDate: tour.startDate,
          endDate: tour.endDate,
          max: tour.max,
          current: tour.current,
          category: tour.category,
          city: tour.city,
          reviewCount: tour.reviewCount,
          avgRating: tour.avgRating,
          status: tour.status,
          score: tour.score,
          criteria: tour.criteria,
        };
      }),
    );

    return res.status(200).json({ tours: topToursWithImages });
  } catch (error) {
    console.error("Lỗi gợi ý tour:", error);
    res
      .status(500)
      .json({ message: "Có lỗi khi gợi ý tour.", error: error.message });
  }
};

const cancelTour = async (req, res) => {
  const tourId = req.params.tourId;
  const userId = req.userId;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const tour = await Tour.findById(tourId);
    if (!tour) {
      return res.status(404).json({ message: "Tour not found" });
    }

    if (
      tour.status === TOUR_STATUS.CANCELLED ||
      tour.status === TOUR_STATUS.COMPLETED
    ) {
      return res
        .status(400)
        .json({ message: "Cannot cancel a completed or cancelled tour" });
    }

    // Admin hủy tour
    if (user.role === USER_ROLES.ADMIN) {
      tour.status = TOUR_STATUS.CANCELLED;
      await tour.save();

      // Cập nhật trạng thái các booking
      await BookingRq.updateMany(
        { tourId: tourId, status: BOOKING_RQ_STATUS.PAID },
        { $set: { status: BOOKING_RQ_STATUS.REFUND } },
      );

      await BookingRq.updateMany(
        {
          tourId: tourId,
          status: {
            $in: [BOOKING_RQ_STATUS.PENDING, BOOKING_RQ_STATUS.ASSIGNED],
          },
        },
        { $set: { status: BOOKING_RQ_STATUS.CANCELLED } },
      );

      return res
        .status(200)
        .json({ message: "Tour cancelled by admin successfully" });
    }
    if (user.role === USER_ROLES.TOUR_GUIDE) {
      // Tour guide hủy tour
      if (tour.tourGuideId.toString() !== userId) {
        return res.status(403).json({ message: "Not authorized to cancel" });
      }

      tour.status = TOUR_STATUS.PENDING;
      await tour.save();

      return res
        .status(200)
        .json({ message: "Tour cancelled by tour guide successfully" });
    } else {
      // User hủy tour cho bản thân
      const booking = await BookingRq.findOne({ tourId, userId });

      if (!booking) {
        return res.status(404).json({ message: "Booking not found for user" });
      }

      if (
        booking.status === BOOKING_RQ_STATUS.CANCELLED ||
        booking.status === BOOKING_RQ_STATUS.REFUND
      ) {
        return res
          .status(400)
          .json({ message: "Booking already cancelled or refunded" });
      }

      // Trừ đúng số lượng người đặt trong tour
      tour.current -= booking.quantity;

      // Xóa user khỏi tour.userIds
      tour.userIds = tour.userIds.filter(
        (item) => item.userId.toString() !== userId,
      );

      // Lưu tour
      await tour.save();

      // Nếu booking đang PAID thì chuyển sang REFUND
      if (booking.status === BOOKING_RQ_STATUS.PAID) {
        booking.status = BOOKING_RQ_STATUS.REFUND;
        await booking.save();
      }

      return res
        .status(200)
        .json({ message: "Tour cancelled by user successfully" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getTourStatistics = async (req, res) => {
  try {
    // Thống kê số lượng tour theo tháng khởi hành (startDate)
    const toursByMonth = await Tour.aggregate([
      {
        $group: {
          _id: { $month: "$startDate" }, // Lấy tháng từ startDate
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 }, // Sắp xếp theo tháng tăng dần
      },
    ]);

    // Khởi tạo dữ liệu mặc định cho 12 tháng (1-12)
    const monthStats = Array.from({ length: 12 }, (_, i) => ({
      _id: i + 1,
      count: 0,
    }));

    // Map dữ liệu vào mảng mặc định
    toursByMonth.forEach((item) => {
      const target = monthStats.find((m) => m._id === item._id);
      if (target) target.count = item.count;
    });

    // Thống kê số lượng tour theo thể loại
    const toursByCategory = await Tour.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
    ]);

    // Khởi tạo dữ liệu mặc định cho category
    const categoryStats = Object.values(TOUR_CATEGORY).map((value) => ({
      _id: value,
      count: 0,
    }));

    // Map dữ liệu vào mảng mặc định
    toursByCategory.forEach((item) => {
      const target = categoryStats.find((c) => c._id === item._id);
      if (target) target.count = item.count;
    });

    return res.status(200).json({
      toursByMonth: monthStats,
      toursByCategory: categoryStats,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
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
};
