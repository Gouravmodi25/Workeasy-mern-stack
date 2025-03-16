const ApiResponse = require("../utils/ApiResponse.js");
const UserModel = require("../model/user.model.js");
const validator = require("validator");
const generateOtp = require("../utils/generateOtp.js");
const sendMail = require("../utils/sendEmail.js");
const sendSms = require("../utils/sendSms.js");
const ApiError = require("../utils/ApiError.js");
const asyncHandler = require("../utils/asyncHandler.js");
const uploadOnCloudinary = require("../utils/uploadOnCloudinary.js");
const validateAddress = require("../utils/validateAddress.js");
const validateGender = require("../utils/validateGender.js");
const validateDateOfBirth = require("../utils/validateDateOfBirth.js");
const fs = require("fs");
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
  const { email, fullname } = req.user;

  const searchUser = await UserModel.findOne({ email }).select(
    "+otp +otpExpires"
  );

  const otp = generateOtp();

  searchUser.otp = otp;
  searchUser.otpExpires = Date.now() + 10 * 60 * 1000;
  searchUser.save({ validateBeforeSave: false });

  const EmailMessage = `
  <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0;">
    <div style="max-width: 400px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); overflow: hidden;">
        <div style=" background-color: #4CAF50; color: white; padding: 20px; text-align: center;">
            <h2 style="margin: 0;">WorkEasy OTP Verification</h2>
        </div>
        <div style="padding: 20px; text-align: center;">
            <h2 style="margin: 0;">Hi ${fullname},</h2>
            <h4>Your One-Time Password (OTP) for verification is:</h4>
            <div style="font-size: 28px; font-weight: bold; margin: 20px 0; color: #333;">${otp}</div>
            <p>This code is valid for <strong>10 minutes minutes</strong>.</p>
            <p>If you did not request this code, please ignore this email or <a href="{{supportLink}}" style="color: #4CAF50; text-decoration: none;">contact support</a>.</p>
        </div>
        <div style="border-inline:1px solid white; border-bottom:1px solid white; border-radius:8px; padding: 20px;   background-color: red; text-align: center; font-size: 12px; color: white;">
            &copy; 2025 WorkEasy. All rights reserved.
        </div>
    </div>
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

const completeProfileForUser = asyncHandler(async function (req, res) {
  const { gender, dob, address } = req.body;
  const { _id } = req.user;
  console.log(dob);

  const { isVerified } = req.user;

  if (!isVerified) {
    return res
      .status(401)
      .json(new ApiResponse(400, "Please verify the profile with otp"));
  }

  if ([gender, dob].some((field) => String("" || field).trim() == "")) {
    return res.status(400).json(new ApiResponse(400, "All field are required"));
  }

  const [genderError, dobError, addressError] = [
    validateGender(gender),
    validateDateOfBirth(dob),
    validateAddress(address),
  ];

  if (genderError) {
    return res.status(400).json(new ApiResponse(400, genderError));
  }

  if (addressError) {
    return res.status(400).json(new ApiResponse(400, addressError));
  }

  if (dobError) {
    return res.status(400).json(new ApiResponse(400, dobError));
  }

  const user = await UserModel.findOne({ _id });

  if (!user) {
    return res.status(400).json(new ApiResponse(400, "User not found"));
  }

  const avatarImageLocalPath = req?.file?.path;
  let avatarImage = user.avatarImage;
  console.log(avatarImageLocalPath);

  if (avatarImageLocalPath) {
    try {
      const cloudinaryResponse = await uploadOnCloudinary(avatarImageLocalPath);
      if (cloudinaryResponse) {
        avatarImage = cloudinaryResponse.url;
      } else {
        return res
          .status(400)
          .json(
            new ApiResponse(400, "Error While uploading image to Cloudinary")
          );
      }
    } catch (error) {
      return res.status(400).json(new ApiResponse(400, error.message));
    }
  } else if (!avatarImage) {
    return res
      .status(400)
      .json(new ApiResponse(400, "Profile Image is required"));
  }

  console.log(avatarImage);

  const newAddress = JSON.parse(address);

  user.gender = gender;
  user.dob = dob;
  user.avatarImage = avatarImage;
  user.address = newAddress;

  user.save({ validateBeforeSave: false });

  console.log(user.address);
  console.log(user.avatarImage);

  return res
    .status(200)
    .json(new ApiResponse(200, "Profile Completed Successfully", user));
});

module.exports = {
  signupUser,
  otpVerification,
  resendOtp,
  completeProfileForUser,
};
