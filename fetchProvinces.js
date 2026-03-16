// Script để lấy tọa độ (latitude, longitude) cho các tỉnh của Việt Nam
// chạy bằng lệnh: node fetchProvinces.js, 1 lần chạy sẽ lấy tọa độ cho tất cả các tỉnh
// và lưu vào file ./data/vietnam-provinces-latlng.json

const fs = require("fs-extra");
const NodeGeocoder = require("node-geocoder");
const path = require("path");

const cacheFile = "./data/vietnam-provinces-latlng.json";
const cacheDir = path.dirname(cacheFile);

// Tạo thư mục data nếu chưa có
async function ensureCacheDir() {
  const exists = await fs.pathExists(cacheDir);
  if (!exists) {
    await fs.mkdirp(cacheDir);
  }
}

const geocoder = NodeGeocoder({
  provider: "openstreetmap",
  httpAdapter: "https",
  headers: {
    "User-Agent": "MyTourApp/1.0 (contact@mydomain.com)",
    Referer: "https://mytourapp.example.com",
  },
});

// Load hoặc tạo mới cache
async function loadCache() {
  await ensureCacheDir();
  const exists = await fs.pathExists(cacheFile);
  if (!exists) await fs.writeJson(cacheFile, {});
  return await fs.readJson(cacheFile);
}

// Lưu cache
async function saveCache(cache) {
  await fs.writeJson(cacheFile, cache, { spaces: 2 });
}

// Delay đơn giản
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Hàm lấy tọa độ cho tỉnh có delay tránh bị block
async function fetchAndSaveAllCoordinates(provinces) {
  const cache = await loadCache();

  for (const province of provinces) {
    if (cache[province]) {
      console.log(`Đã có tọa độ trong cache: ${province}`);
      continue;
    }

    try {
      const res = await geocoder.geocode(`${province}, Việt Nam`);
      if (res.length === 0) {
        console.warn(`Không tìm được tọa độ cho ${province}`);
        cache[province] = null;
      } else {
        const { latitude, longitude } = res[0];
        cache[province] = { latitude, longitude };
        console.log(`Lấy được tọa độ cho ${province}:`, cache[province]);
      }
    } catch (error) {
      console.error(`Lỗi lấy tọa độ cho ${province}:`, error.message);
      cache[province] = null;
    }

    // Delay 1500ms (1.5 giây) giữa các request tránh bị block
    await delay(1500);
  }

  await saveCache(cache);
  console.log("Đã lưu cache tọa độ cho tất cả tỉnh.");
}

// Danh sách các tỉnh bạn đã cho
const provinces = [
  "An Giang",
  "Bà Rịa - Vũng Tàu",
  "Bạc Liêu",
  "Bắc Giang",
  "Bắc Kạn",
  "Bắc Ninh",
  "Bến Tre",
  "Bình Dương",
  "Bình Định",
  "Bình Phước",
  "Bình Thuận",
  "Cà Mau",
  "Cao Bằng",
  "Cần Thơ",
  "Đà Nẵng",
  "Đắk Lắk",
  "Đắk Nông",
  "Điện Biên",
  "Đồng Nai",
  "Đồng Tháp",
  "Gia Lai",
  "Hà Giang",
  "Hà Nam",
  "Hà Nội",
  "Hà Tĩnh",
  "Hải Dương",
  "Hải Phòng",
  "Hậu Giang",
  "Hòa Bình",
  "Hưng Yên",
  "Khánh Hòa",
  "Kiên Giang",
  "Kon Tum",
  "Lai Châu",
  "Lạng Sơn",
  "Lào Cai",
  "Lâm Đồng",
  "Long An",
  "Nam Định",
  "Nghệ An",
  "Ninh Bình",
  "Ninh Thuận",
  "Phú Thọ",
  "Phú Yên",
  "Quảng Bình",
  "Quảng Nam",
  "Quảng Ngãi",
  "Quảng Ninh",
  "Quảng Trị",
  "Sóc Trăng",
  "Sơn La",
  "Tây Ninh",
  "Thái Bình",
  "Thái Nguyên",
  "Thanh Hóa",
  "Thừa Thiên Huế",
  "Tiền Giang",
  "TP. Hồ Chí Minh",
  "Trà Vinh",
  "Tuyên Quang",
  "Vĩnh Long",
  "Vĩnh Phúc",
  "Yên Bái",
];

fetchAndSaveAllCoordinates(provinces).catch(console.error);
