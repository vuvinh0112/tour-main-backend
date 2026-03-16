const getRoleName = (roleNumber) => {
  const roleMap = {
    0: "Admin",
    1: "Manager",
    2: "Seller",
    3: "TourGuide",
    4: "User",
  };
  return roleMap[roleNumber] || "unknown";
};

module.exports = { getRoleName };
