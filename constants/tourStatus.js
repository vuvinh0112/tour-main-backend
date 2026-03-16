const TOUR_STATUS = {
  PENDING: 1, // Chờ phân công
  ASSIGNED: 2, // Đã phân công tourguide
  IN_PROGRESS: 3, // Đang diễn ra
  COMPLETED: 4, // Hoàn thành
  CANCELLED: 0, // Đã hủy
};

const TOUR_STATUS_VALUES = Object.values(TOUR_STATUS);

module.exports = {
  TOUR_STATUS,
  TOUR_STATUS_VALUES,
};
