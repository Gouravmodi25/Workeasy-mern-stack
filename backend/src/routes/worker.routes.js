const express = require("express");
const {
  signupWorker,
  otpVerification,
  resendOtp,
  completeProfileDetailsWorker,
  forgotPasswordWorker,
  resetPasswordOtpVerification,
  resetPassword,
  loginWorker,
  loginOtpVerification,
  logoutWorker,
} = require("../controller/worker.controller.js");
const upload = require("../middleware/multer.middleware.js");
const workerRouter = express.Router();
const workerAuth = require("../middleware/workerAuth.middleware.js");

// for signup worker

workerRouter.route("/signup").post(signupWorker);

// for worker after sign up otp verification

workerRouter.route("/verify-otp").post(workerAuth, otpVerification);

// resend otp for worker

workerRouter.route("/resend-otp").post(workerAuth, resendOtp);

// worker complete profile
workerRouter
  .route("/complete-profile")
  .post(workerAuth, upload.single("avatarImage"), completeProfileDetailsWorker);

// forgot password route

workerRouter.route("/forgot-password").post(forgotPasswordWorker);

// for reset Password otp verification

workerRouter
  .route("/reset-password-otp-verification")
  .post(resetPasswordOtpVerification);

// for reset password

workerRouter.route("/reset-password").patch(resetPassword);

// login worker route

workerRouter.route("/login").post(loginWorker);

// login otp verification

workerRouter
  .route("/login-otp-verification")
  .post(workerAuth, loginOtpVerification);

// logout worker

workerRouter.route("/logout").post(workerAuth, logoutWorker);

module.exports = workerRouter;
