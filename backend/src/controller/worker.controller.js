const ApiResponse = require("../utils/ApiResponse.js");
const ApiError = require("../utils/ApiError.js");
const uploadOnCloudinary = require("../utils/uploadOnCloudinary.js");
const deleteOnCloudinary = require("../utils/deleteOnCloudinary.js");
const generateOtp = require("../utils/generateOtp.js");
const asyncHandler = require("../utils/asyncHandler.js");
const WorkerModel = require("../model/worker.model.js");
const validator = require("validator");
const otpVerificationEmailTemplate = require("../utils/otpVerificationEmailTemplate.js");
const afterOtpVerificationEmailTemplate = require("../utils/afterOtpVerificationEmailTemplate.js");
const sendMail = require("../utils/sendEmail.js");

// for generating token
const generateAccessToken = async (workerId) => {
  try {
    const worker = await WorkerModel.findById(workerId);

    if (!worker) {
      throw new ApiError(400, "User Not Found");
    }

    const accessToken = worker.generateAccessToken();

    worker.accessToken = accessToken;

    await worker.save({ validateBeforeSave: false });

    return accessToken;
  } catch (error) {
    console.log("Error while generating token", error);
    throw new ApiError(401, "Error While generating accessToken");
  }
};

// for signup worker

const signupWorker = asyncHandler(async function (req, res) {
  const { email, password, fullname, phoneNumber } = req.body;

  if (
    [email, password, fullname, phoneNumber].some(
      (field) => String("" || field).trim() == ""
    )
  ) {
    return res
      .status(400)
      .json(new ApiResponse(400, "All fields are required"));
  }

  if (!validator.isEmail(email)) {
    return res
      .status(400)
      .json(new ApiResponse(400, "Invalid Email,Please enter valid email"));
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

  if (password.length < 8) {
    return res
      .status(400)
      .json(new ApiResponse(400, "Password should be 8 character"));
  }

  const pattern = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@#$%^&+=!]).{8,}$/;

  if (!pattern.test(password)) {
    return res
      .status(400)
      .json(new ApiResponse(400, "Password should be strong"));
  }

  const existingWorker = await WorkerModel.findOne({
    $or: [{ email }, { phoneNumber }],
  });

  if (existingWorker) {
    return res
      .status(400)
      .json(new ApiResponse(400, "Worker is already existed "));
  }

  const createWorker = await WorkerModel.create({
    email,
    phoneNumber: `+91${phoneNumber}`,
    fullname,
    password,
  });

  if (!createWorker) {
    return res
      .status(400)
      .json(new ApiResponse(400, "Error while register worker"));
  }

  const worker = await WorkerModel.findById(createWorker._id).select(
    "-password -age"
  );

  //   for generating otp

  const otp = generateOtp();

  //   for generating access token

  const accessToken = await generateAccessToken(worker._id);

  worker.otp = otp;
  worker.otpExpires = Date.now() + 10 * 60 * 1000;
  worker.accessToken = accessToken;

  await worker.save({ validateBeforeSave: false });

  await sendMail({
    to: worker.email,
    subject: "Otp For Verification",
    text: otpVerificationEmailTemplate(worker.fullname, worker.otp),
  });

  const options = {
    secure: true,
  };

  return res
    .status(201)
    .cookie("accessToken", accessToken, options)
    .json(new ApiResponse(201, "Successfully Registered worker", worker));
});

// otp verification

const otpVerification = asyncHandler(async (req, res) => {
  const { otp } = req.body;

  const { _id } = req?.worker;

  const searchWorker = await WorkerModel.findById(_id).select(
    "+otp +otpExpires"
  );

  console.log(searchWorker);

  if (!searchWorker) {
    return res.status(400).json(new ApiResponse(400, "Worker not found"));
  }

  if (searchWorker.otp !== otp) {
    return res.status(400).json(new ApiResponse(400, "Invalid Otp"));
  }

  if (searchWorker.otpExpires < Date.now()) {
    // once otp is expires then otp will be null
    searchWorker.isVerified = true;
    searchWorker.otp = null;
    searchWorker.otpExpires = null;

    await searchWorker.save({ validateBeforeSave: false });
    return res
      .status(400)
      .json(new ApiResponse(400, "OTP has expired. Request a new one."));
  }

  searchWorker.isVerified = true;
  searchWorker.otp = null;
  searchWorker.otpExpires = null;

  await searchWorker.save({ validateBeforeSave: false });

  const verifiedWorker = await WorkerModel.findById(searchWorker._id).select(
    "-password"
  );

  const message = afterOtpVerificationEmailTemplate(
    verifiedWorker.fullname,
    verifiedWorker.email
  );

  await sendMail({
    to: verifiedWorker.email,
    subject: "Welcome to WorkEasy",
    text: message,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, "Successfully Verified Otp", verifiedWorker));
});

// resend otp if otp is expires

const resendOtp = asyncHandler(async (req, res) => {
  const { email, fullname } = req?.worker;

  const searchWorker = await WorkerModel.findOne({ email }).select(
    "+otp +otpExpires"
  );

  const otp = generateOtp();

  searchWorker.otp = otp;
  searchWorker.otpExpires = Date.now() + 10 * (60 * 1000);
  await searchWorker.save({ validateBeforeSave: false });

  await sendMail({
    to: searchWorker.email,
    subject: "Otp For Verification",
    text: otpVerificationEmailTemplate(searchWorker.fullname, otp),
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Successfully resend otp on email", searchWorker)
    );
});

module.exports = {
  signupWorker,
  otpVerification,
  resendOtp,
};
