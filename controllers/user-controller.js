const User = require("../models/user.model.js");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Tour = require("../models/tour.model.js");
const BookingRq = require("../models/bookingRq.model.js");
const { USER_ROLES } = require("../constants/userRole.js");

const getRole = async (req, res) => {
  const id = req.userId;
  if (!id) {
    return res.status(404).json({ error: true, message: "User not found!" });
  }
  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({ error: true, message: "User not found!" });
  }
  return res.status(200).json({ error: false, data: user.role });
};

const getUsers = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(404).json({ error: true, message: "User not found!" });
    }
    const user = await User.findById(userId);

    if (user.role !== USER_ROLES.ADMIN) {
      return res
        .status(403)
        .json({ error: true, message: "Access denied. Admins only." });
    }
    const accounts = await User.find();
    res.status(200).json({ error: false, data: accounts });
  } catch {
    res.status(500).json({ error: true, message: "Internal server error" });
  }
};

const getUserById = async (req, res) => {
  const id = req.userId;
  if (!id) {
    return res.status(404).json({ error: true, message: "User not found!" });
  }
  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({ error: true, message: "User not found!" });
  }
  return res.status(200).json({ error: false, data: user });
};

const getUserByAdmin = async (req, res) => {
  const id = req.userId;
  const userId = req.params.userId; // Get the user ID from the request parameters
  if (!id) {
    return res.status(404).json({ error: true, message: "User not found!" });
  }
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ error: true, message: "User not found!" });
  }
  return res.status(200).json({ error: false, data: user });
};

const getAllSellers = async (req, res) => {
  try {
    const sellers = await User.find({ role: 2 }).select("_id fullName phone");
    return res.status(200).json({
      message: "Sellers fetched successfully",
      data: sellers,
    });
  } catch (error) {
    console.error("Error fetching sellers:", error);
    return res.status(500).json({
      message: "Error fetching sellers",
      error: error.message,
    });
  }
};

const getAllTourGuides = async (req, res) => {
  try {
    const tourGuides = await User.find({ role: 3 }).select(
      "_id fullName phone"
    );
    return res.status(200).json({
      message: "Tour guides fetched successfully",
      data: tourGuides,
    });
  } catch (error) {
    console.error("Error fetching tourGuides:", error);
    return res.status(500).json({
      message: "Error fetching tourGuides",
      error: error.message,
    });
  }
};

const createUser = async (req, res) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res
        .status(400)
        .json({ error: true, message: "Request body is empty" });
    }

    const { username, password, fullName, email, phone, dob, address } =
      req.body;
    if (!fullName || !email || !phone || !password || !username) {
      return res
        .status(400)
        .json({ error: true, message: "All fields are required" });
    }

    const isUser = await User.findOne({ username });
    if (isUser) {
      return res
        .status(400)
        .json({ error: true, message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      password: hashedPassword,
      fullName,
      email,
      phone,
      ...(dob && { dob }),
      ...(address && { address }),
    });

    await user.save();

    return res.status(201).json({
      error: false,
      message: "Registration Successful",
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return res.status(500).json({
      error: true,
      message: "Server error",
    });
  }
};

const login = async (req, res) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return res
      .status(400)
      .json({ error: true, message: "Request body is empty" });
  }

  const { username, password } = req.body;
  if (!username || !password) {
    return res
      .status(400)
      .json({ error: true, message: "All fields are required" });
  }

  const isUser = await User.findOne({ username });
  if (!isUser) {
    return res.status(400).json({ error: true, message: "Username is wrong!" });
  }

  const isMatch = await bcrypt.compare(password, isUser.password);
  if (!isMatch) {
    return res.status(400).json({ error: true, message: "Password is wrong!" });
  }

  const accessToken = jwt.sign(
    { userId: isUser._id },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "72h" }
  );

  return res.status(200).json({
    error: false,
    message: "Login Successful",
    data: {
      role: isUser.role,
      roleName: Object.keys(USER_ROLES).find(
        key => USER_ROLES[key] === isUser.role
      )
    },
    token: accessToken,
  });
};

const update = async (req, res) => {
  const id = req.userId;

  const { fullName, email, phone, dob, address, role, status } = req.body;
  if (!id) {
    return res.status(404).json({ error: true, message: "User not found!" });
  }

  const user = await User.findByIdAndUpdate(id, {
    fullName,
    email,
    phone,
    dob,
    address,
    role,
    status,
  });
  await user.save();
  return res
    .status(200)
    .json({ error: false, message: "User updated successfully!" });
};

const updateByAdmin = async (req, res) => {
  const userId = req.params.userId;
  const { fullName, email, phone, role, status } = req.body;

  if (!userId) {
    return res.status(404).json({ error: true, message: "User not found!" });
  }

  const user = await User.findByIdAndUpdate(userId, {
    fullName,
    email,
    phone,
    role,
    status,
  });
  await user.save();
  return res
    .status(200)
    .json({ error: false, message: "User updated successfully!" });
};

const changePassword = async (req, res) => {
  const id = req.userId;
  const { oldPassword, newPassword } = req.body;

  if (!id) {
    return res.status(404).json({ error: true, message: "User not found!" });
  }

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({ error: true, message: "User not found!" });
  }
  if (!oldPassword || !newPassword) {
    return res
      .status(400)
      .json({ message: "Vui lòng nhập đầy đủ oldPassword và newPassword." });
  }

  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) {
    return res
      .status(400)
      .json({ error: true, message: "Mật khẩu cũ không chính xác." });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedPassword;
  await user.save();

  return res
    .status(200)
    .json({ error: false, message: "Đổi mật khẩu thành công!" });
};

const deleteAccount = async (req, res) => {
  const id = req.userId;
  const userId = req.params.userId;
  if (!id) {
    return res.status(404).json({ error: true, message: "User not found!" });
  }
  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({ error: true, message: "User not found!" });
  }
  if (user.role !== USER_ROLES.ADMIN) {
    return res
      .status(403)
      .json({ error: true, message: "Access denied. Admins only." });
  }
  const userToDelete = await User.findById(userId);
  if (userToDelete.role === USER_ROLES.ADMIN) {
    return res
      .status(403)
      .json({ error: true, message: "Cannot delete admin user!" });
  }
  if (userToDelete.role === USER_ROLES.TOUR_GUIDE) {
    const tour = await Tour.findOne({ tourGuideId: userId });
    if (tour) {
      return res.status(403).json({
        error: true,
        message: "Cannot delete tour guide with existing tours!",
      });
    }
    const resDelete = await User.findByIdAndDelete(userId);
    const bookingRqs = await BookingRq.deleteMany({ sellerId: userId });
    if (bookingRqs.deletedCount > 0) {
      console.log("Deleted booking requests for seller:", userId);
    }
    return res
      .status(200)
      .json({ error: false, message: "Tour guide deleted successfully!" });
  }

  if (userToDelete.role === USER_ROLES.SELLER) {
    const bookingRQ = await BookingRq.findOne({
      sellerId: userId,
      status: { $in: [2, 3, 4] },
    });
    if (bookingRQ) {
      return res.status(403).json({
        error: true,
        message: "Cannot delete seller with existing booking requests!",
      });
    }
    const resDelete = await User.findByIdAndDelete(userId);
    const bookingRqs = await BookingRq.deleteMany({ sellerId: userId });
    if (bookingRqs.deletedCount > 0) {
      console.log("Deleted booking requests for seller:", userId);
    }
    return res
      .status(200)
      .json({ error: false, message: "Seller deleted successfully!" });
  }

  const resDelete = await User.findByIdAndDelete(userId);
  return res
    .status(200)
    .json({ error: false, message: "User deleted successfully!" });
};

module.exports = {
  getRole,
  getUsers,
  getUserById,
  createUser,
  login,
  update,
  changePassword,
  deleteAccount,
  getAllSellers,
  getAllTourGuides,
  getUserByAdmin,
  updateByAdmin,
};
