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
const resetPasswordEmailTemplate = require("../utils/resetPasswordTemplate.js");
const otpVerificationEmailTemplate = require("../utils/otpVerificationEmailTemplate");
const fs = require("fs");
const afterOtpVerificationEmailTemplate = require("../utils/afterOtpVerificationEmailTemplate.js");

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

  // for sendEmail
  await sendMail({
    to: user.email,
    subject: "Otp For Verification",
    text: otpVerificationEmailTemplate(user.fullname, user.otp),
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
  console.log(email);

  const { otp } = req.body;
  console.log(otp);

  //Search the user which are signup
  const searchUser = await UserModel.findOne({
    email,
  }).select("+otp +otpExpires");

  if (!searchUser) {
    return res.status(400).json(new ApiResponse(400, "User  not found"));
  }

  console.log("searchUser", searchUser.otp);

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

  // message
  const message = afterOtpVerificationEmailTemplate(
    verifiedUser.fullname,
    verifiedUser.email
  );

  await sendMail({
    to: verifiedUser.email,
    subject: "Welcome to WorkEasy",
    text: message,
  });

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
            <p>This code is valid for <strong>10 minutes</strong>.</p>
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
      fs.unlinkSync(avatarImageLocalPath);
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

  // for email

  const message = `
    <div style="font-family: Arial, sans-serif; background-color: #1a1a1a; margin: 0; padding: 0; color: #f2f2f2;">
    <div style="max-width: 600px; margin: 20px auto; background-color: #333; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);">
        <div style="padding: 20px; text-align: center; background-color: #555;">
            <h2 style="margin: 0; font-size: 24px; color: #f2f2f2;">🎉 Profile Completed Successfully!</h2>
        </div>
        <div style="padding: 20px; color: #dcdcdc;">
            <p style="font-size: 16px; margin: 0;">Hi <strong>{{fullname}}</strong>,</p>
            <p style="font-size: 16px; margin: 8px 0;">Your profile has been successfully completed on <strong>WorkEasy</strong>.</p>
            <p style="font-size: 16px; margin: 8px 0;">You are now ready to explore all the features and services on our platform. We are thrilled to have you with us!</p>
            <p style="font-size: 16px; margin: 8px 0;">If you need any assistance, feel free to reach out to our support team.</p>
            <p style="font-size: 16px; margin: 8px 0;">Best Regards,<br>The WorkEasy Team</p>
        </div>
        <div style="background-color: #444; padding: 10px; text-align: center;">
            <p style="font-size: 12px; color: #aaa;">&copy; 2025 WorkEasy. All rights reserved.</p>
        </div>
    </div>
</div>
  `;

  await sendMail({
    to: user.email,
    subject: "Otp For Verification",
    text: message,
  });
  console.log(user.address);
  console.log(user.avatarImage);

  return res
    .status(200)
    .json(new ApiResponse(200, "Profile Completed Successfully", user));
});

// for forgot password api
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (email.trim() === "") {
    return res.status(400).json(new ApiResponse(400, "Email is Required"));
  }

  if (!validator.isEmail(email)) {
    return res
      .status(400)
      .json(new ApiResponse(400, "Invalid Email Please enter valid email"));
  }

  const user = await UserModel.findOne({ email }).select("+password");

  if (!user) {
    return res.status(400).json(new ApiResponse(400, "User not found"));
  }

  const resetPasswordToken = user.generateResetPasswordToken();

  const otp = generateOtp();

  user.resetPasswordToken = resetPasswordToken;
  user.resetPasswordOtp = otp;
  user.isResetOtpVerified = false;
  user.resetPasswordOtpExpiry = Date.now() + 10 * 60 * 1000;

  await user.save({ validateBeforeSave: false });

  const message = `
    <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0;">
    <div style="max-width: 400px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); overflow: hidden;">
        <div style=" background-color: #4CAF50; color: white; padding: 20px; text-align: center;">
            <h2 style="margin: 0;">WorkEasy OTP Verification</h2>
        </div>
        <div style="padding: 20px; text-align: center;">
            <h2 style="margin: 0;">Hi ${user.fullname},</h2>
            <h4>Your  One-Time Password (OTP) for reset password is:</h4>
            <div style="font-size: 28px; font-weight: bold; margin: 20px 0; color: #333;">${user.resetPasswordOtp}</div>
            <p>This code is valid for <strong>10 minutes</strong>.</p>
            <p>If you did not request this code, please ignore this email or <a href="{{supportLink}}" style="color: #4CAF50; text-decoration: none;">contact support</a>.</p>
        </div>
        <div style="border-inline:1px solid white; border-bottom:1px solid white; border-radius:8px; padding: 20px;   background-color: red; text-align: center; font-size: 12px; color: white;">
            &copy; 2025 WorkEasy. All rights reserved.
        </div>
    </div>
  </div>
  `;

  await sendMail({
    to: user.email,
    subject: "Otp For Verification",
    text: message,
  });

  const options = {
    secure: true,
  };

  return res
    .status(200)
    .cookie("resetPasswordToken", resetPasswordToken, options)
    .json(new ApiResponse(200, "Successfully sent reset password otp", user));
});

// api for reset password otp verification

const resetPasswordOtpVerification = asyncHandler(async (req, res) => {
  const resetPasswordToken = req?.cookies?.resetPasswordToken;

  const { otp } = req.body;

  if (!otp) {
    return res.status(400).json(new ApiResponse(400, "Otp is required"));
  }

  console.log(resetPasswordToken);

  const user = await UserModel.findOne({
    resetPasswordToken,
    resetPasswordTokenExpiry: { $gt: Date.now() },
  });

  console.log(user);

  if (!user) {
    return res.status(400).json(new ApiResponse(400, "Invalid Reset Token"));
  }

  if (user.resetPasswordOtp !== otp) {
    return res.status(400).json(new ApiResponse(400, "Invalid Otp"));
  }

  if (user.resetPasswordOtpExpiry < Date.now()) {
    return res
      .status(400)
      .json(new ApiResponse(400, "OTP has expired. Request a new one."));
  }

  // after verification
  user.isResetOtpVerified = true;
  user.resetPasswordOtp = null;
  user.resetPasswordOtpExpiry = null;

  await user.save({ validateBeforeSave: false });

  const verifiedUser = await UserModel.findById(user._id).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, "Otp Verified", verifiedUser));
});

// for reset password

const resetPassword = asyncHandler(async (req, res) => {
  const { newPassword, confirmPassword } = req.body;

  if (
    [newPassword, confirmPassword].some(
      (field) => String(field || "").trim() === ""
    )
  ) {
    return res
      .status(400)
      .json(new ApiResponse(400, "All fields are Required"));
  }

  if (newPassword.length < 8) {
    return res
      .status(400)
      .json(
        new ApiResponse(400, "Password must be at least 8 characters long")
      );
  }

  if (newPassword !== confirmPassword) {
    return res
      .status(400)
      .json(new ApiResponse(400, "Both Password should be same"));
  }

  const resetPasswordToken = req?.cookies?.resetPasswordToken;

  const user = await UserModel.findOne({
    resetPasswordToken,
    resetPasswordTokenExpiry: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json(new ApiResponse(400, "Invalid Reset Token"));
  }

  user.password = newPassword;
  user.resetPasswordToken = null;
  user.resetPasswordTokenExpiry = null;
  user.isResetOtpVerified = null;

  await user.save({ validateBeforeSave: false });

  await sendMail({
    to: user.email,
    subject: "Password changed successfully",
    text: resetPasswordEmailTemplate(user.fullname),
  });

  const newUser = await UserModel.findById(user._id).select(
    "-password,-isResetOtpVerified"
  );

  const options = {
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("resetPasswordToken", options)
    .json(new ApiResponse(200, "Password Reset Successfully", newUser));
});

// change password api

const changePasswordApi = asyncHandler(async function (req, res) {
  const { _id } = req.user;

  const { newPassword, confirmPassword } = req.body;

  if (
    [newPassword, confirmPassword].some(
      (field) => String(field || "").trim() === ""
    )
  ) {
    return res
      .status(400)
      .json(new ApiResponse(400, "All fields are Required"));
  }

  if (newPassword.length < 8) {
    return res
      .status(400)
      .json(
        new ApiResponse(400, "Password must be at least 8 characters long")
      );
  }

  if (newPassword !== confirmPassword) {
    return res
      .status(400)
      .json(new ApiResponse(400, "Both Password should be same"));
  }

  const user = await UserModel.findById(_id).select("+password");

  const isSamePassword = user.isSamePassword(newPassword);

  if (!isSamePassword) {
    return res
      .status(400)
      .json(
        new ApiResponse(400, "New Password is not same as previous password")
      );
  }

  user.password = newPassword;

  await sendMail({
    to: user.email,
    subject: "Password changed successfully",
    text: resetPasswordEmailTemplate(user.fullname),
  });

  const newUser = await UserModel.findById(user._id).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, "Password Reset Successfully", newUser));
});

// for user login

const loginUser = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;

  if (
    [identifier, password].some((field) => String("" || field).trim() == "")
  ) {
    return res
      .status(400)
      .json(new ApiResponse(400, "ALl fields are required"));
  }

  const user = await UserModel.findOne({
    $or: [{ email: identifier }, { username: identifier }],
  }).select("+password");

  if (!user) {
    return res.status(400).json(new ApiResponse(400, "Invalid Credentials"));
  }

  const isCorrectPassword = user.isCorrectPassword(password);

  if (!isCorrectPassword) {
    return res.status(400).json(new ApiResponse(400, "Incorrect Password"));
  }

  const accessToken = await generateAccessToken(user._id);
  console.log(accessToken);

  const options = {
    secure: true,
  };

  const otp = generateOtp();

  user.otp = otp;
  user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  user.accessToken = accessToken;
  await user.save({ validateBeforeSave: false });

  // mail send

  await sendMail({
    to: user.email,
    subject: "Otp for Verification",
    text: otpVerificationEmailTemplate(user.fullname, user.otp),
  });

  const newUser = await UserModel.findById(user._id).select(
    "-password,+otp,+otpExpires"
  );

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .json(new ApiResponse(200, "Login Account Successfully", newUser));
});

// login otp verification

const loginOtpVerification = asyncHandler(async (req, res) => {
  const { email } = req?.user;
  console.log(email);

  const { otp } = req.body;
  console.log(otp);

  //Search the user which are signup
  const searchUser = await UserModel.findOne({
    email,
  }).select("+otp +otpExpires");

  if (!searchUser) {
    return res.status(400).json(new ApiResponse(400, "User  not found"));
  }

  console.log("searchUser", searchUser.otp);

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

  // message
  const message = `
    <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
        <div style="background-color: #007bff; color: #ffffff; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Welcome to WorkEasy!</h1>
        </div>
        <div style="padding: 20px;">
            <p style="font-size: 16px; color: #333333; line-height: 1.5;">
                Hi <strong>${verifiedUser.fullname}</strong>,
            </p>
            <p style="font-size: 16px; color: #333333; line-height: 1.5;">
                 Your account has been successfully logged in.
            </p>
            <p style="font-size: 16px; color: #333333; line-height: 1.5;">
                Here are your details:
            </p>
            <ul style="font-size: 16px; color: #333333; line-height: 1.5;">
                <li><strong>Full Name:</strong> ${verifiedUser.fullname}</li>
                <li><strong>Email:</strong>${verifiedUser.email}</li>
            </ul>
            <p style="font-size: 16px; color: #333333; line-height: 1.5;">
                If you have any questions or need assistance, feel free to reach out to our support team.
            </p>
            <p style="font-size: 16px; color: #007bff; line-height: 1.5;">
                Best Regards,<br>
                The WorkEasy Team
            </p>
        </div>
        <div style="background-color: #f4f4f4; color: #777777; padding: 10px; text-align: center;">
            <p style="font-size: 12px;">&copy; 2025 WorkEasy. All rights reserved.</p>
        </div>
    </div>
</div>
  `;

  await sendMail({
    to: verifiedUser.email,
    subject: "Welcome to WorkEasy",
    text: message,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, "Successfully Verified Otp", verifiedUser));
});

// logout user

const loggedOut = asyncHandler(async (req, res) => {
  const { user } = req;

  const loggedInUser = await UserModel.findByIdAndUpdate(
    user._id,
    {
      $unset: {
        accessToken: 1,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .json(new ApiResponse(200, "User Logged Out Successfully", loggedInUser));
});

module.exports = {
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
};
