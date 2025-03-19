const express = require("express");
const {
  signupWorker,
  otpVerification,
  resendOtp,
  completeProfileDetailsWorker,
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

module.exports = workerRouter;
