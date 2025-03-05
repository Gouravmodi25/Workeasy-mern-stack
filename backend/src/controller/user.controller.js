const ApiResponse = require("../utils/ApiResponse.js");
const UserModel = require("../model/user.model.js");
const validator = require("validator");
const generateOtp = require("../utils/generateOtp.js");
const sendMail = require("../utils/sendEmail.js");
const sendSms = require("../utils/sendSms.js");
const ApiError = require("../utils/ApiError.js");
const asyncHandler = require("../utils/asyncHandler.js");

// for generate accessToken

const generateAccessToken = async (userId) => {
  try {
    const user = await UserModel.findById(userId);

    if (!user) {
      throw new ApiError(400, "User Not Found");
    }

    const accessToken = user.generateAccessToken();
    user.accessToken = accessToken;
    await user.save({ validateBeforeSave: false });
    return accessToken;
  } catch (error) {
    console.error("Error generating token:", error.message);
    throw new ApiError(500, "Something Went Wrong While Generating Token");
  }
};

// for user signup

const signupUser = asyncHandler(async (req, res) => {
  const { fullname, email, username, phoneNumber, password } = req.body;

  if (
    [fullname, email, username, phoneNumber, password].some(
      (field) => String(field || "").trim() == ""
    )
  ) {
    return res
      .status(400)
      .json(new ApiResponse(400, "All fields are required"));
  }

  if (!validator.isEmail(email)) {
    return res
      .status(400)
      .json(new ApiResponse(400, "Please enter a valid email"));
  }

  if (!validator.isLength(username, { min: 4, max: 20 })) {
    return res
      .status(400)
      .json(
        new ApiResponse(400, "Username must be between 4 to 20 characters")
      );
  }

  if (!/[A-Za-z]/.test(username)) {
    return res
      .status(400)
      .json(new ApiResponse(400, "Username must contain letters"));
  }

  if (!/\d/.test(username)) {
    return res
      .status(400)
      .json(new ApiResponse(400, "Username must contain at least one numbers"));
  }

  if (!/[\W_]/.test(username)) {
    return res
      .status(400)
      .json(
        new ApiResponse(
          400,
          "Username must contain at least one special character"
        )
      );
  }

  if (!validator.isLength(phoneNumber, { min: 10, max: 10 })) {
    return res
      .status(400)
      .json(new ApiResponse(400, "Mobile number must be exactly 10 digits."));
  }

  if (!validator.isNumeric(phoneNumber)) {
    return res
      .status(400)
      .json(new ApiResponse(400, "Mobile number must be numeric."));
  }

  if (!/^[6-9]\d{9}$/.test(phoneNumber)) {
    return res
      .status(400)
      .json(
        new ApiResponse(400, "Mobile number must started from 6,7,8 and 9.")
      );
  }

  const existedUser = await UserModel.findOne({
    $or: [{ email }, { username }, { phoneNumber }],
  });

  if (existedUser) {
    return res
      .status(400)
      .json(new ApiResponse(400, "User is already existed "));
  }

  if (password.length < 8) {
    return res
      .status(400)
      .json(new ApiResponse(400, "Password should be strong "));
  }

  const createdUser = await UserModel.create({
    fullname,
    email,
    username,
    phoneNumber: `+91${phoneNumber}`,
    password,
  });

  //   for generating otp
  const otp = generateOtp();

  //   for token
  const accessToken = await generateAccessToken(createdUser._id);
  const options = {
    secure: true,
  };

  const user = await UserModel.findById(createdUser._id).select([
    "-password -age",
  ]);

  user.otp = otp;
  user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  user.accessToken = accessToken;
  await user.save({ validateBeforeSave: false });

  //   for email

  const EmailMessage = `
     <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd;">
          <h2 style="color: #4CAF50;">🔐 WorkEasy OTP Verification</h2>
          <p>Your OTP is: <strong style="color: #ff5722; font-size: 18px;">${otp}</strong></p>
          <p>This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
          <p>Thank you for using WorkEasy!</p>
          <hr>
          <small style="color: #777;">If you did not request this OTP, please ignore this email.</small>
      </div>
    `;

  // for sendEmail
  await sendMail({
    to: user.email,
    subject: "Otp For Verification",
    text: EmailMessage,
  });

  if (!createdUser) {
    return res
      .status(400)
      .json(new ApiResponse(400, "Error While Registering User"));
  }

  return res
    .status(201)
    .cookie("accessToken", accessToken, options)
    .json(new ApiResponse(201, "User Registered SuccessFully", user));
});

// for otp verification

const otpVerification = asyncHandler(async (req, res) => {
  const { email } = req?.user;

  const { otp } = req.body;
  console.log(otp);

  //Search the user which are signup
  const searchUser = await UserModel.findOne({
    email,
  }).select("+otp +otpExpires");

  if (!searchUser) {
    return res.status(400).json(new ApiResponse(400, "User  not found"));
  }

  console.log("searchUser", searchUser);

  if (searchUser.otp !== otp) {
    return res.status(400).json(new ApiResponse(400, "Invalid Otp"));
  }

  if (searchUser.otpExpires < Date.now()) {
    return res
      .status(400)
      .json(new ApiResponse(400, "OTP has expired. Request a new one."));
  }

  // after otp verification
  searchUser.isVerified = true;
  searchUser.otp = null;
  searchUser.otpExpires = null;

  await searchUser.save({ validateBeforeSave: false });

  const verifiedUser = await UserModel.findById(searchUser._id).select(
    "-password"
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Successfully Verified Otp", verifiedUser));
});

// for resend otp

const resendOtp = asyncHandler(async (req, res) => {
  const { email } = req.user;

  const searchUser = await UserModel.findOne({ email }).select(
    "+otp +otpExpires"
  );

  const otp = generateOtp();

  searchUser.otp = otp;
  searchUser.otpExpires = Date.now() + 10 * 60 * 1000;
  searchUser.save({ validateBeforeSave: false });

  const EmailMessage = `
  <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd;">
       <h2 style="color: #4CAF50;">🔐 WorkEasy OTP Verification</h2>
       <p>Your OTP is: <strong style="color: #ff5722; font-size: 18px;">${otp}</strong></p>
       <p>This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
       <p>Thank you for using WorkEasy!</p>
       <hr>
       <small style="color: #777;">If you did not request this OTP, please ignore this email.</small>
   </div>
 `;

  await sendMail({
    to: searchUser.email,
    subject: "Otp For Verification",
    text: EmailMessage,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, "Successfully resend otp on email", searchUser));
});

// for complete profile

module.exports = {
  signupUser,
  otpVerification,
  resendOtp,
};
