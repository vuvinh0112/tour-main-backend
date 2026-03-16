const BOOKING_RQ_STATUS = {
  PENDING: 1, // Chờ phân công
  ASSIGNED: 2, // Đã phân công
  PAID: 3, // Đã thanh toán
  REFUND: 4, // hoàn tiền
  REFUNDED: 5, // đã hoàn tiền
  CANCELLED: 0, // Đã hủy
};

const BOOKING_RQ_STATUS_VALUES = Object.values(BOOKING_RQ_STATUS);

module.exports = {
  BOOKING_RQ_STATUS,
  BOOKING_RQ_STATUS_VALUES,
};
