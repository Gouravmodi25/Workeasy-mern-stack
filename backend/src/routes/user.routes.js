const express = require("express");
const userRouter = express.Router();
const upload = require("../middleware/multer.middleware.js");

const {
  signupUser,
  otpVerification,
  resendOtp,
  completeProfileForUser,
  forgotPassword,
  resetPasswordOtpVerification,
  resetPassword,
  changePasswordApi,
  loginUser,
  loginOtpVerification,
  loggedOut,
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

// for  reset password otp verification
userRouter
  .route("/reset-password-otp-verification")
  .post(resetPasswordOtpVerification);

// for reset password
userRouter.route("/reset-password").patch(resetPassword);

// for changed password
userRouter.route("/changed-password").patch(userAuth, changePasswordApi);

// login route
userRouter.route("/login").post(loginUser);

// login-otp-verification
userRouter
  .route("/login-otp-verification")
  .post(userAuth, loginOtpVerification);

// logout user
userRouter.route("/logout").post(userAuth, loggedOut);

module.exports = userRouter;
