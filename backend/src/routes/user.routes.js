const express = require("express");
const userRouter = express.Router();
const {
  signupUser,
  otpVerification,
  resendOtp,
} = require("../controller/user.controller.js");

const userAuth = require("../middleware/userAuth.middleware.js");

// for user signup route
userRouter.route("/signup").post(signupUser);

// for user otp verification route
userRouter.route("/verify-otp").post(userAuth, otpVerification);

// for resend otp route
userRouter.route("/resend-otp").post(userAuth, resendOtp);

module.exports = userRouter;
