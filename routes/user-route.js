const express = require("express");
const {
  getUsers,
  createUser,
  login,
  update,
  changePassword,
  deleteAccount,
  getUserById,
  getAllSellers,
  getAllTourGuides,
  getRole,
  getUserByAdmin,
  updateByAdmin,
} = require("../controllers/user-controller.js");
const authMiddleware = require("../middleware/auth");

const userRouter = express.Router();

userRouter.get("/", authMiddleware, getUsers);
userRouter.post("/create-user", createUser);
userRouter.get("/getRole", authMiddleware, getRole);
userRouter.post("/login", login);
userRouter.post("/update", authMiddleware, update);
userRouter.post("/change-password", authMiddleware, changePassword);
userRouter.delete("/delete/:userId", authMiddleware, deleteAccount);
userRouter.get("/get-user", authMiddleware, getUserById);
userRouter.get("/getSeller", authMiddleware, getAllSellers);
userRouter.get("/getTourGuides", authMiddleware, getAllTourGuides);
userRouter.get("/get-user/:userId", authMiddleware, getUserByAdmin);
userRouter.post("/update/:userId", authMiddleware, updateByAdmin);

module.exports = userRouter;
