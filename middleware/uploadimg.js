const multer = require("multer");
const { createTour } = require("../controllers/tour-controller.js");

const storage = multer.memoryStorage(); // Hoặc dùng diskStorage nếu muốn lưu local
const upload = multer({ storage });

const uploadTourMiddleware = upload.array("images", 10); // key: "images", max 10 ảnh

module.exports = {
  uploadTourMiddleware,
  createTour,
};
