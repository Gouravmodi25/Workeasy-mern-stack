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
  changePassword,
  loggedInWorkerDetails,
  getAllWorker,
  toFetchWorkerByWorkerId,
  toAcceptJobAppointment,
  toCancelJobAppointment,
  toChangeAvailability,
  toStartWorkAppointment,
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

// changed password

workerRouter.route("/change-password").post(workerAuth, changePassword);

// to get logged in worker details

workerRouter
  .route("/logged-in-worker-details")
  .get(workerAuth, loggedInWorkerDetails);

// to get all worker

workerRouter.route("/get-all-worker").get(getAllWorker);

// to get worker by workerId on param

workerRouter.route("/get-worker/:workerId").get(toFetchWorkerByWorkerId);

// to accept appointment of user within ten minutes

workerRouter
  .route("/accept-appointment")
  .patch(workerAuth, toAcceptJobAppointment);

// to cancel appointment by worker if they are available

workerRouter
  .route("/cancel-appointment")
  .patch(workerAuth, toCancelJobAppointment);

// change availability  of worker

workerRouter
  .route("/change-availability")
  .patch(workerAuth, toChangeAvailability);

// change appointment status to ongoing

workerRouter
  .route("/appointment-ongoing")
  .patch(workerAuth, toStartWorkAppointment);

module.exports = workerRouter;
