const express = require("express");
const userRouter = express.Router();
const upload = require("../middleware/multer.middleware.js");

const {
  signupUser,
  otpVerification,
  resendOtp,
  completeProfileForUser,
  forgotPassword,
} = require("../controller/user.controller.js");

const userAuth = require("../middleware/userAuth.middleware.js");

// for user signup route
userRouter.route("/signup").post(signupUser);

// for user otp verification route
userRouter.route("/verify-otp").post(userAuth, otpVerification);

// for resend otp route
userRouter.route("/resend-otp").post(userAuth, resendOtp);

// for complete profile route
userRouter
  .route("/complete-profile")
  .post(userAuth, upload.single("avatarImage"), completeProfileForUser);

//forgot password
userRouter.route("/forgot-password").post(forgotPassword);

module.exports = userRouter;
