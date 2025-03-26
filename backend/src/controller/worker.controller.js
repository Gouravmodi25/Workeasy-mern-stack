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
const validateGender = require("../utils/validateGender.js");
const validateDateOfBirth = require("../utils/validateDateOfBirth.js");
const validateAddress = require("../utils/validateAddress.js");
const resetPasswordEmailTemplate = require("../utils/resetPasswordTemplate.js");
const AppointmentModel = require("../model/appointment.model.js");
const cron = require("node-cron");
const moment = require("moment");
const validateTime = require("../utils/timeValidation.js");

// convert 12 hour format to 24 hour format

const convertTo24HourFormat = (time) => {
  const [timePart, period] = time.split(" ");
  let [hours, minutes] = timePart.split(":").map(Number);

  if (period.toUpperCase() === "PM" && hours !== 12) {
    hours += 12;
  }
  if (period.toUpperCase() === "AM" && hours === 12) {
    hours = 0;
  }

  return { hours, minutes };
};

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
  const { email } = req?.worker;

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

// complete profile details

const completeProfileDetailsWorker = asyncHandler(async (req, res) => {
  const {
    gender,
    dob,
    skill,
    experience,
    charges,
    availability,
    visitationFees,
    address,
  } = req.body;

  console.log(req.body);

  const { _id, isVerified } = req.worker;

  if (!isVerified) {
    return res
      .status(401)
      .json(new ApiResponse(400, "Please verify the profile with otp"));
  }

  if (
    [
      gender,
      dob,
      skill,
      experience,
      charges,
      visitationFees,
      availability,
    ].some((field) => String("" || field).trim() == "")
  ) {
    return res.status(400).json(new ApiResponse(400, "All field are required"));
  }

  const validateAvailability = (availability) => {
    const validAvailability = ["Available", "Unavailable", "On Leave"];

    if (!availability || !validAvailability.includes(availability)) {
      return "Availability must be Available,Unavailable and On Leave";
    }

    return null;
  };

  console.log(address);

  const [genderError, dobError, addressError, availabilityError] = [
    validateGender(gender),
    validateDateOfBirth(dob),
    validateAddress(address),
    validateAvailability(availability),
  ];

  if (availabilityError) {
    return res.status(400).json(new ApiResponse(400, availabilityError));
  }

  if (genderError) {
    return res.status(400).json(new ApiResponse(400, genderError));
  }

  if (addressError) {
    return res.status(400).json(new ApiResponse(400, addressError));
  }

  if (dobError) {
    return res.status(400).json(new ApiResponse(400, dobError));
  }

  const worker = await WorkerModel.findOne({ _id });

  //   for avatar image

  const avatarImageLocalPath = req?.file?.path;
  let avatarImage = worker.avatarImage;
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
      // fs.unlinkSync(avatarImageLocalPath);
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

  worker.gender = gender;
  worker.dob = dob;
  worker.avatarImage = avatarImage;
  worker.address = newAddress;
  worker.availability = availability;
  worker.charges = charges;
  worker.visitationFees = visitationFees;
  worker.skill = skill;
  worker.experience = experience;

  await worker.save({ validateBeforeSave: false });

  const message = `
    <div style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #121212; color: #e0e0e0;">
    <div style="max-width: 600px; margin: 20px auto; background-color: #1e1e1e; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #333333; padding: 20px; text-align: center;">
            <h2 style="margin: 0; color: #ffffff;">Profile Completed! 🎉</h2>
        </div>
        <div style="padding: 20px;">
            <p>Hi <strong>${worker.fullname}</strong>,</p>
            <p>Your profile on <strong>WorkEasy</strong> is now complete and visible to clients. You are now eligible to be hired directly for jobs that match your skills.</p>
            <p>To boost your chances of getting hired:</p>
            <ul style="padding-left: 20px; margin: 10px 0;">
                <li>Keep your profile updated regularly.</li>
                <li>Set your availability to active.</li>
                <li>Respond quickly to any offers.</li>
            </ul>
            <p>Visit your dashboard to manage your profile and view new opportunities:</p>
            <p><a href="#" style="color: #1e90ff; text-decoration: none;">Go to Dashboard</a></p>
            <p>If you need assistance, feel free to contact our support team.</p>
        </div>
        <div style="background-color: #333333; padding: 15px; text-align: center; font-size: 12px; color: #888888;">
            © 2025 WorkEasy. All rights reserved.
        </div>
    </div>
</div>
  `;

  await sendMail({
    to: worker.email,
    subject: "Profile Completed Successfully",
    text: message,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, "Profile Completed Successfully", worker));
});

// if worker forgot password

const forgotPasswordWorker = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (email.trim() === "") {
    return res.status(400).json(new ApiResponse(400, "Email is Required"));
  }

  if (!validator.isEmail(email)) {
    return res
      .status(400)
      .json(new ApiResponse(400, "Invalid Email Please enter valid email"));
  }

  const worker = await WorkerModel.findOne({ email }).select("+password");

  if (!worker) {
    return res.status(400).json(new ApiResponse(400, "User not found"));
  }

  const resetPasswordToken = worker.generateResetPasswordToken();

  const otp = generateOtp();

  worker.resetPasswordToken = resetPasswordToken;
  worker.resetPasswordOtp = otp;
  worker.isResetOtpVerified = false;
  worker.resetPasswordOtpExpiry = Date.now() + 10 * 60 * 1000;

  await worker.save({ validateBeforeSave: false });

  const message = `
    <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0;">
    <div style="max-width: 400px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); overflow: hidden;">
        <div style=" background-color: #4CAF50; color: white; padding: 20px; text-align: center;">
            <h2 style="margin: 0;">WorkEasy OTP Verification</h2>
        </div>
        <div style="padding: 20px; text-align: center;">
            <h2 style="margin: 0;">Hi ${worker.fullname},</h2>
            <h4>Your  One-Time Password (OTP) for reset password is:</h4>
            <div style="font-size: 28px; font-weight: bold; margin: 20px 0; color: #333;">${worker.resetPasswordOtp}</div>
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
    to: worker.email,
    subject: "Otp For Verification",
    text: message,
  });

  const options = {
    secure: true,
  };

  return res
    .status(200)
    .cookie("resetPasswordToken", resetPasswordToken, options)
    .json(new ApiResponse(200, "Successfully sent reset password otp", worker));
});

// reset password otp verification api

const resetPasswordOtpVerification = asyncHandler(async (req, res) => {
  const resetPasswordToken = req?.cookies?.resetPasswordToken;

  const { otp } = req.body;

  if (!otp) {
    return res.status(400).json(new ApiResponse(400, "Otp is required"));
  }

  console.log(resetPasswordToken);

  const worker = await WorkerModel.findOne({
    resetPasswordToken,
    resetPasswordTokenExpiry: { $gt: Date.now() },
  });

  console.log(worker);

  if (!worker) {
    return res.status(400).json(new ApiResponse(400, "Invalid Reset Token"));
  }

  console.log(worker.resetPasswordOtp);

  if (worker.resetPasswordOtp !== otp) {
    return res.status(400).json(new ApiResponse(400, "Invalid Otp"));
  }

  if (worker.resetPasswordOtpExpiry < Date.now()) {
    return res
      .status(400)
      .json(new ApiResponse(400, "OTP has expired. Request a new one."));
  }

  // after verification
  worker.isResetOtpVerified = true;
  worker.resetPasswordOtp = null;
  worker.resetPasswordOtpExpiry = null;

  await worker.save({ validateBeforeSave: false });

  const verifiedWorker = await WorkerModel.findById(worker._id).select(
    "-password"
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Otp Verified", verifiedWorker));
});

// reset password for worker

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

  const worker = await WorkerModel.findOne({
    resetPasswordToken,
    resetPasswordTokenExpiry: { $gt: Date.now() },
  });

  if (!worker) {
    return res.status(400).json(new ApiResponse(400, "Invalid Reset Token"));
  }

  worker.password = newPassword;
  worker.resetPasswordToken = null;
  worker.resetPasswordTokenExpiry = null;
  worker.isResetOtpVerified = null;

  await worker.save({ validateBeforeSave: false });

  await sendMail({
    to: worker.email,
    subject: "Password changed successfully",
    text: resetPasswordEmailTemplate(worker.fullname),
  });

  const newWorker = await WorkerModel.findById(worker._id).select(
    "-password -isResetOtpVerified"
  );

  const options = {
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("resetPasswordToken", options)
    .json(new ApiResponse(200, "Password Reset Successfully", newWorker));
});

// login for worker

const loginWorker = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;

  if (
    [identifier, password].some((field) => String("" || field).trim() == "")
  ) {
    return res
      .status(400)
      .json(new ApiResponse(400, "ALl fields are required"));
  }

  const worker = await WorkerModel.findOne({
    $or: [{ email: identifier }, { phoneNumber: `+91${identifier}` }],
  }).select("+password");

  if (!worker) {
    return res.status(400).json(new ApiResponse(400, "Invalid Credentials"));
  }

  const isCorrectPassword = worker.isCorrectPassword(password);

  if (!isCorrectPassword) {
    return res.status(400).json(new ApiResponse(400, "Incorrect Password"));
  }

  const accessToken = await generateAccessToken(worker._id);
  console.log(accessToken);

  const options = {
    secure: true,
  };

  const otp = generateOtp();

  worker.otp = otp;
  worker.isVerified = false;
  worker.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  worker.accessToken = accessToken;
  await worker.save({ validateBeforeSave: false });

  // mail send

  await sendMail({
    to: worker.email,
    subject: "Otp for Verification",
    text: otpVerificationEmailTemplate(worker.fullname, worker.otp),
  });

  const newWorker = await WorkerModel.findById(worker._id).select(
    "-password +otp +otpExpires"
  );

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .json(new ApiResponse(200, "Login Account Successfully", newWorker));
});

// after login verification

const loginOtpVerification = asyncHandler(async (req, res) => {
  const { email } = req?.worker;
  console.log(email);

  const { otp } = req.body;
  console.log(otp);

  //Search the user which are signup
  const searchWorker = await WorkerModel.findOne({
    email,
  }).select("+otp +otpExpires");

  if (!searchWorker) {
    return res.status(400).json(new ApiResponse(400, "User  not found"));
  }

  console.log("searchWorker", searchWorker.otp);

  if (searchWorker.otp !== otp) {
    return res.status(400).json(new ApiResponse(400, "Invalid Otp"));
  }

  if (searchWorker.otpExpires < Date.now()) {
    return res
      .status(400)
      .json(new ApiResponse(400, "OTP has expired. Request a new one."));
  }

  // after otp verification
  searchWorker.isVerified = true;
  searchWorker.otp = null;
  searchWorker.otpExpires = null;

  await searchWorker.save({ validateBeforeSave: false });

  const verifiedWorker = await WorkerModel.findById(searchWorker._id).select(
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
                Hi <strong>${verifiedWorker.fullname}</strong>,
            </p>
            <p style="font-size: 16px; color: #333333; line-height: 1.5;">
                 Your account has been successfully logged in.
            </p>
            <p style="font-size: 16px; color: #333333; line-height: 1.5;">
                Here are your details:
            </p>
            <ul style="font-size: 16px; color: #333333; line-height: 1.5;">
                <li><strong>Full Name:</strong> ${verifiedWorker.fullname}</li>
                <li><strong>Email:</strong>${verifiedWorker.email}</li>
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
    to: verifiedWorker.email,
    subject: "Welcome to WorkEasy",
    text: message,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, "Successfully Verified Otp", verifiedWorker));
});

// logout api for worker

const logoutWorker = asyncHandler(async (req, res) => {
  const { worker } = req;

  const loggedInWorker = await WorkerModel.findByIdAndUpdate(
    worker._id,
    {
      $unset: {
        accessToken: 1,
      },
    },
    {
      new: true,
    }
  );

  if (!loggedInWorker.isVerified) {
    return res.status(400).json(new ApiResponse(400, "Please Verified Otp"));
  }

  const options = {
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .json(new ApiResponse(200, "User Logged Out Successfully", loggedInWorker));
});

// change password for worker

const changePassword = asyncHandler(async (req, res) => {
  const { _id } = req.worker;
  const { oldPassword, newPassword } = req.body;

  // Check for missing fields
  if (
    [oldPassword, newPassword].some(
      (field) => String(field || "").trim() === ""
    )
  ) {
    return res
      .status(400)
      .json(new ApiResponse(400, "All fields are required"));
  }

  // Check password length
  if (newPassword.length < 8) {
    return res
      .status(400)
      .json(
        new ApiResponse(400, "Password must be at least 8 characters long")
      );
  }

  // Find the worker and include the password field
  const worker = await WorkerModel.findById(_id).select("+password");

  if (!worker) {
    return res.status(404).json(new ApiResponse(404, "User not found"));
  }

  if (!worker.isVerified) {
    return res.status(400).json(new ApiResponse(400, "Please Verified Otp"));
  }

  // Check if the old password is correct
  const isCorrectPassword = await worker.isCorrectPassword(oldPassword);
  if (!isCorrectPassword) {
    return res
      .status(400)
      .json(new ApiResponse(400, "Old password is not correct"));
  }

  // Check if the new password is the same as the current password
  const isSamePassword = await worker.isCorrectPassword(newPassword);
  if (isSamePassword) {
    return res
      .status(400)
      .json(
        new ApiResponse(
          400,
          "New password must be different from the current password"
        )
      );
  }

  // Check if old and new passwords are the same
  if (oldPassword === newPassword) {
    return res
      .status(400)
      .json(
        new ApiResponse(
          400,
          "New password should not be the same as the old password"
        )
      );
  }

  // Update the worker's password and save
  worker.password = newPassword;
  await worker.save({ validateBeforeSave: true });

  // Send confirmation email
  await sendMail({
    to: worker.email,
    subject: "Password Changed Successfully",
    text: resetPasswordEmailTemplate(worker.fullname),
  });

  // Return success response without the password
  const newWorker = await WorkerModel.findById(worker._id).select("-password");
  return res
    .status(200)
    .json(new ApiResponse(200, "Password Changed Successfully", newWorker));
});

// to get details of logged in worker

const loggedInWorkerDetails = asyncHandler(async (req, res) => {
  const { worker } = req;

  if (!worker.isVerified) {
    return res.status(400).json(new ApiResponse(400, "Please Verified Otp"));
  }

  const loggedInWorker = await WorkerModel.findById(worker._id).select(
    "-password"
  );

  if (!loggedInWorker) {
    return res
      .status(404)
      .json(new ApiResponse(404, "Worker not found Please Login"));
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Success fully fetched Worker Details",
        loggedInWorker
      )
    );
});

// to get all worker

const getAllWorker = asyncHandler(async (req, res) => {
  const allWorker = await WorkerModel.find({}).select("-password");

  if (allWorker.length === 0) {
    return res.status(200).json(new ApiResponse(200, "No Worker Found"));
  }

  if (!allWorker) {
    return res
      .status(400)
      .json(new ApiResponse(400, "Error while fetching worker"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Success fully fetch all worker", allWorker));
});

// to get worker by worker id

const toFetchWorkerByWorkerId = asyncHandler(async (req, res) => {
  const { workerId } = req.params;

  const worker = await WorkerModel.findById(workerId).select("-password");

  if (!worker) {
    return res
      .status(400)
      .json(new ApiResponse(400, "Failed to fetch worker Worker Not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Worker fetched successfully", worker));
});

// accept job appointment by worker and set reach time for reaching at client location

const toAcceptJobAppointment = asyncHandler(async (req, res) => {
  const { appointmentId, reachTime } = req.body;

  const { worker } = req;

  if (
    [appointmentId, reachTime].some(
      (field) => String(field || "").trim() === ""
    )
  ) {
    return res
      .status(400)
      .json(new ApiResponse(400, "All fields are required"));
  }

  const timeError = validateTime(reachTime);

  if (timeError) {
    return res.status(400).json(new ApiResponse(400, timeError));
  }

  const loggedWorker = await WorkerModel.findById(worker._id).select(
    "-password"
  );

  if (!loggedWorker) {
    return res.status(400).json(new ApiResponse(400, "Worker not found"));
  }

  const appointment = await AppointmentModel.findById(appointmentId);

  if (!appointment) {
    return res.status(400).json(new ApiResponse(400, "Appointment not found"));
  }

  const { hours: reachHours, minutes: reachMinutes } =
    convertTo24HourFormat(reachTime);
  const { hours: appointmentHours, minutes: appointmentMinutes } =
    convertTo24HourFormat(appointment.appointmentTime);

  if (
    reachHours < appointmentHours ||
    (reachHours === appointmentHours && reachMinutes < appointmentMinutes)
  ) {
    return res
      .status(400)
      .json(
        new ApiResponse(
          400,
          "Reach time should be greater than or equal to appointment time"
        )
      );
  }

  // Ensure reach time is not more than 20 minutes after appointment time
  const maxAllowedMinutes = appointmentMinutes + 20;
  const maxAllowedHour = appointmentHours + Math.floor(maxAllowedMinutes / 60);
  const maxAllowedMinute = maxAllowedMinutes % 60;

  if (
    reachHours > maxAllowedHour ||
    (reachHours === maxAllowedHour && reachMinutes > maxAllowedMinute)
  ) {
    return res
      .status(400)
      .json(
        new ApiResponse(
          400,
          "Reach time should not be more than 20 minutes after the appointment time"
        )
      );
  }

  if (appointment.appointmentStatus === "Accepted") {
    return res
      .status(400)
      .json(new ApiResponse(400, "Appointment already accepted"));
  }

  if (
    appointment.appointmentStatus === "Cancelled" &&
    appointment.appointmentHistory[0].status === "Cancelled"
  ) {
    return res
      .status(400)
      .json(new ApiResponse(400, "Appointment is cancelled"));
  }

  if (
    appointment.appointmentStatus === "Completed" &&
    appointment.isCompleted &&
    appointment.appointmentHistory[0].status === "Completed"
  ) {
    return res
      .status(400)
      .json(new ApiResponse(400, "Appointment is already completed"));
  }

  appointment.appointmentStatus = "Accepted";
  appointment.appointmentHistory.unshift({
    status: "Accepted",
    remarks: "Appointment Accepted by Worker",
    date: new Date(),
  });

  await appointment.save({ validateBeforeSave: false });

  if (
    worker &&
    Array.isArray(worker.appointmentHistory) &&
    worker.appointmentHistory.length > 0
  ) {
    // Find the specific appointment in the worker's history
    const appointmentIndex = worker.appointmentHistory.findIndex(
      (history) =>
        history.appointmentId?.toString() === appointment._id?.toString()
    );

    if (appointmentIndex !== -1) {
      console.log("Worker found and appointment matched");

      worker.appointmentHistory[appointmentIndex].appointmentStatus =
        appointment.appointmentStatus;
      worker.appointmentHistory[appointmentIndex].remarks =
        "Appointment Accepted by Worker";
      worker.appointmentHistory[appointmentIndex].reachTime = reachTime;

      await worker.save({
        validateBeforeSave: false,
      });
    } else {
      console.log("No matching appointment found in worker history");
    }
  }

  const message = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background-color: #1f2937; border-radius: 8px; color: #e5e7eb;">
    <h2 style="text-align: center; color: #34d399;">✅ Appointment Accepted</h2>
    <p style="text-align: center; font-size: 16px;">Dear ${appointment.userData.fullname},</p>
    <p style="text-align: center; font-size: 16px; line-height: 1.5;">
        Your appointment has been <strong style="color: #34d399;">accepted</strong> by the worker.
        Please be ready at your address for the service.
    </p>

    <div style="margin: 20px 0; padding: 15px; background-color: #111827; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
        <p style="font-size: 16px; margin: 8px 0; color: #d1d5db;"><strong>Service:</strong> <span style="color: #fbbf24;">${worker.skill}</span></p>
        <p style="font-size: 16px; margin: 8px 0; color: #d1d5db;"><strong>Worker:</strong> <span style="color: #fbbf24;">${worker.fullname}</span></p>
        <p style="font-size: 16px; margin: 8px 0; color: #d1d5db;"><strong>Date:</strong> <span style="color: #fbbf24;">${appointment.appointmentDate}</span></p>
        <p style="font-size: 16px; margin: 8px 0; color: #d1d5db;"><strong>Time:</strong> <span style="color: #fbbf24;">${appointment.appointmentTime}</span></p>
        <p style="font-size: 16px; margin: 8px 0; color: #d1d5db;"><strong>Address:</strong> <span style="color: #fbbf24;">${appointment.userData.address.address}, ${appointment.userData.address.city}, ${appointment.userData.address.state}, ${appointment.userData.address.country}</span></p>
    </div>

    <p style="text-align: center; font-size: 14px; color: #9ca3af;">
        If you have any questions or need to reschedule, please contact us at: 
        <a href="mailto:support@workeasy.com" style="color: #34d399; text-decoration: none;">support@workeasy.com</a>
    </p>

    <p style="text-align: center; font-size: 14px; margin-top: 10px; color: #9ca3af;">
        Thank you for choosing WorkEasy!
    </p>
</div>
  `;

  await sendMail({
    to: appointment.userData.email,
    subject: "Appointment Accepted by Worker",
    text: message,
  });

  const newAppointment = await AppointmentModel.findById(
    appointment._id
  ).select("-password");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Appointment Accepted Successfully by Worker ",
        newAppointment
      )
    );
});

// automatically cancel the appointment if worker is not accepted the appointment within 10 minutes

cron.schedule(
  "* * * * *",
  asyncHandler(async (req, res) => {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - 10 * 60000); // 10 minutes ago
    const todayDate = new Date().toISOString().split("T")[0];

    const appointments = await AppointmentModel.find({
      appointmentStatus: "Scheduled",
      appointmentHistory: {
        $elemMatch: {
          status: "Scheduled",
        },
      },
      appointmentDate: todayDate,
      appointmentBookedDate: { $lte: cutoffTime },
    });

    console.log("appointments", appointments);

    for (let appointment of appointments) {
      const worker = await WorkerModel.findById(appointment.workerId).select(
        "-password"
      );

      console.log("worker", worker);

      // Cancel the appointment and update the status
      appointment.appointmentStatus = "Cancelled";
      appointment.cancelled = true;
      appointment.cancellationReason =
        "Worker did not accept the appointment within 10 minutes";
      appointment.cancellationDate = Date.now();
      appointment.appointmentHistory.unshift({
        status: "Cancelled",
        remarks: "Appointment Cancelled by System",
        date: new Date(),
      });

      await appointment.save({ validateBeforeSave: false });

      if (
        worker &&
        Array.isArray(worker.appointmentHistory) &&
        worker.appointmentHistory.length > 0
      ) {
        // Find the specific appointment in the worker's history
        const appointmentIndex = worker.appointmentHistory.findIndex(
          (history) =>
            history.appointmentId?.toString() === appointment._id?.toString()
        );

        if (appointmentIndex !== -1) {
          console.log("Worker found and appointment matched");

          worker.appointmentHistory[appointmentIndex].appointmentStatus =
            appointment.appointmentStatus;
          worker.appointmentHistory[appointmentIndex].cancelled = true;
          worker.appointmentHistory[appointmentIndex].cancellationReason =
            appointment.cancellationReason;

          await worker.save({
            validateBeforeSave: false,
          });
        } else {
          console.log("No matching appointment found in worker history");
        }
      }

      const message = `
        <div style="background-color: #121212; color: #e5e5e5; font-family: Arial, sans-serif; line-height: 1.6; padding: 20px;">
          <div style="max-width: 600px; margin: auto; background-color: #1e1e1e; padding: 20px; border-radius: 10px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
            <h2 style="text-align: center; color: #ff4d4f; font-size: 24px; margin-bottom: 10px;">🚫 Appointment Status Cancelled</h2>
            <p style="margin: 10px 0; font-size: 16px; color: #b0b0b0;">
              Hello <span style="color: #34d399; font-weight: bold;">${appointment.userData.fullname}</span>,
            </p>
            <p style="margin: 10px 0; font-size: 16px; color: #b0b0b0;">
              We regret to inform you that your appointment for the service <span style="color: #ff4d4f; font-weight: bold;">${worker.skill}</span> 
              scheduled on <span style="color: #ff4d4f; font-weight: bold;">${appointment.appointmentDate}</span> at 
              <span style="color: #ff4d4f; font-weight: bold;">${appointment.appointmentTime}</span> has been <span style="color: #ff4d4f; font-weight: bold;">cancelled</span>.
            </p>
            <div style="background-color: #292929; padding: 10px; border-radius: 8px; margin: 10px 0; color: #a0a0a0;">
              <p><strong>Service:</strong> ${worker.skill}</p>
              <p><strong>Worker:</strong> ${worker.fullname}</p>
              <p><strong>Date:</strong> ${appointment.appointmentDate}</p>
              <p><strong>Time:</strong> ${appointment.appointmentTime}</p>
              <p><strong>Reason:</strong> ${appointment.cancellationReason}</p>
            </div>
            <p style="margin: 10px 0; font-size: 16px; color: #b0b0b0;">
              We apologize for any inconvenience caused. If you have any questions or need assistance, please contact us at 
              <a href="mailto:support@workeasy.com" style="color: #34d399; text-decoration: none;">support@workeasy.com</a>.
            </p>
            <hr style="border: 0; border-top: 1px solid #444; margin: 15px 0;">
            <p style="text-align: center; color: #777; font-size: 12px;">
              Thank you for choosing WorkEasy. We are here to help you anytime!
            </p>
          </div>
        </div>
      `;

      // Sending emails to both the user and the worker
      await sendMail({
        to: appointment.userData.email,
        subject: "Appointment Cancelled",
        text: message,
      });

      await sendMail({
        to: worker.email,
        subject: "Appointment Cancelled",
        text: message,
      });
    }

    return res.status(200).json(
      new ApiResponse(200, "Appointment Cancelled Successfully", {
        appointments,
        worker,
      })
    );
  })
);

// to cancelled job appointment by worker

const toCancelJobAppointment = asyncHandler(async (req, res) => {
  const { appointmentId, cancellationReason } = req.body;
  const loggedWorker = req.worker;

  if (
    [appointmentId, cancellationReason].some(
      (field) => String(field || "").trim() === ""
    )
  ) {
    return res
      .status(400)
      .json(new ApiResponse(400, "All fields are required"));
  }

  console.log("appointmentId", appointmentId);
  console.log("workerId", loggedWorker._id);

  const appointment = await AppointmentModel.findOne({
    _id: appointmentId,
    workerId: loggedWorker._id,
  });

  if (!appointment) {
    return res.status(400).json(new ApiResponse(400, "Appointment not found"));
    1;
  }

  const worker = await WorkerModel.findById(appointment.workerId).select(
    "-password"
  );

  if (!worker) {
    return res.status(400).json(new ApiResponse(400, "Worker not found"));
  }

  if (appointment.appointmentStatus === "Cancelled") {
    return res
      .status(400)
      .json(new ApiResponse(400, "Appointment already cancelled"));
  }

  if (appointment.appointmentStatus === "Completed") {
    return res
      .status(400)
      .json(new ApiResponse(400, "You cant cancelled completed appointment"));
  }

  appointment.cancelled = true;
  appointment.cancellationReason = cancellationReason;
  appointment.cancellationDate = Date.now();
  appointment.appointmentStatus = "Cancelled";
  appointment.appointmentHistory.unshift({
    status: "Cancelled",
    remarks: "Appointment Cancelled by Worker",
    date: new Date(),
  });

  await appointment.save({ validateBeforeSave: false });

  if (
    worker &&
    Array.isArray(worker.appointmentHistory) &&
    worker.appointmentHistory.length > 0
  ) {
    const appointmentIndex = worker.appointmentHistory.findIndex(
      (history) =>
        history.appointmentId?.toString() === appointment._id?.toString()
    );

    if (appointmentIndex !== -1) {
      console.log("Worker found and appointment matched");

      worker.appointmentHistory[appointmentIndex].appointmentStatus =
        appointment.appointmentStatus;
      worker.appointmentHistory[appointmentIndex].cancelled = true;
      worker.appointmentHistory[appointmentIndex].cancellationReason =
        appointment.cancellationReason;

      await worker.save({
        validateBeforeSave: false,
      });
    } else {
      console.log("No matching appointment found in worker history");
    }
  }

  const message = `
        <div style="background-color: #121212; color: #e5e5e5; font-family: Arial, sans-serif; line-height: 1.6; padding: 20px;">
          <div style="max-width: 600px; margin: auto; background-color: #1e1e1e; padding: 20px; border-radius: 10px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
            <h2 style="text-align: center; color: #ff4d4f; font-size: 24px; margin-bottom: 10px;">🚫 Appointment Status Cancelled</h2>
            <p style="margin: 10px 0; font-size: 16px; color: #b0b0b0;">
              Hello <span style="color: #34d399; font-weight: bold;">${appointment.userData.fullname}</span>,
            </p>
            <p style="margin: 10px 0; font-size: 16px; color: #b0b0b0;">
              We regret to inform you that your appointment for the service <span style="color: #ff4d4f; font-weight: bold;">${worker.skill}</span> 
              scheduled on <span style="color: #ff4d4f; font-weight: bold;">${appointment.appointmentDate}</span> at 
              <span style="color: #ff4d4f; font-weight: bold;">${appointment.appointmentTime}</span> has been <span style="color: #ff4d4f; font-weight: bold;">cancelled</span>.
            </p>
            <div style="background-color: #292929; padding: 10px; border-radius: 8px; margin: 10px 0; color: #a0a0a0;">
              <p><strong>Service:</strong> ${worker.skill}</p>
              <p><strong>Worker:</strong> ${worker.fullname}</p>
              <p><strong>Date:</strong> ${appointment.appointmentDate}</p>
              <p><strong>Time:</strong> ${appointment.appointmentTime}</p>
              <p><strong>Reason:</strong> ${appointment.cancellationReason}</p>
            </div>
            <p style="margin: 10px 0; font-size: 16px; color: #b0b0b0;">
              We apologize for any inconvenience caused. If you have any questions or need assistance, please contact us at 
              <a href="mailto:support@workeasy.com" style="color: #34d399; text-decoration: none;">support@workeasy.com</a>.
            </p>
            <hr style="border: 0; border-top: 1px solid #444; margin: 15px 0;">
            <p style="text-align: center; color: #777; font-size: 12px;">
              Thank you for choosing WorkEasy. We are here to help you anytime!
            </p>
          </div>
        </div>`;

  await sendMail({
    to: appointment.userData.email,
    subject: "Appointment Cancelled",
    text: message,
  });

  const newAppointment = await AppointmentModel.findById(appointment._id);

  return res.status(200).json(
    new ApiResponse(200, "Appointment Cancelled Successfully", {
      newAppointment,
      worker,
    })
  );
});

// change availability of worker

const toChangeAvailability = asyncHandler(async (req, res) => {
  const { worker } = req;

  const { availability } = req.body;

  if (availability.trim() == "") {
    return res
      .status(400)
      .json(new ApiResponse(400, "Availability is required"));
  }

  const validAvailability = ["Available", "Unavailable", "On Work", "On Leave"];

  if (!validAvailability.includes(availability)) {
    return res
      .status(400)
      .json(
        new ApiResponse(
          400,
          "Availability must be valid options are Available ,Unavailable ,On Leave ,On Work"
        )
      );
  }

  const loggedWorker = await WorkerModel.findById(worker._id).select(
    "-password"
  );

  loggedWorker.availability = availability;

  await loggedWorker.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Availability changed successfully", loggedWorker)
    );
});

// start the work of appointment by worker

const toStartWorkAppointment = asyncHandler(async (req, res) => {
  try {
    const { appointmentId, estimateTime } = req.body;
    const { worker } = req;

    // Validate required fields
    if (
      ![appointmentId, estimateTime].every(
        (field) => field && String(field).trim()
      )
    ) {
      return res
        .status(400)
        .json(new ApiResponse(400, "All fields are required"));
    }

    // Fetch the appointment
    const appointment = await AppointmentModel.findById(appointmentId);
    if (!appointment) {
      return res
        .status(400)
        .json(
          new ApiResponse(400, "Appointment not found or Invalid Appointment")
        );
    }

    // Valid estimate time options
    const validEstimateTime = [
      "30 min",
      "45 min",
      "60 min",
      "75 min",
      "90 min",
      "120 min",
    ];
    if (!validEstimateTime.includes(estimateTime)) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            "Estimate time isn't valid. Options are 30 min, 45 min, 60 min, 75 min, 90 min, 120 min"
          )
        );
    }

    console.log("getCurrentTimeWithFormat :", getCurrentFormattedTime());

    console.log("busy until", typeof calculateBusyUntil(estimateTime));

    const parseTimeString = (timeStr) => {
      const [time, modifier] = timeStr.split(" ");
      let [hours, minutes] = time.split(":").map(Number);

      if (modifier === "PM" && hours !== 12) {
        hours += 12;
      } else if (modifier === "AM" && hours === 12) {
        hours = 0;
      }

      return { hours, minutes };
    };

    // Get current time and appointment time in 24-hour format
    const { hours: currentHours, minutes: currentMinutes } = parseTimeString(
      getCurrentFormattedTime()
    );
    const { hours: appointmentHours, minutes: appointmentMinutes } =
      parseTimeString(appointment.appointmentTime);
    // Compare timestamps

    console.log(appointmentHours);

    if (
      currentHours > appointmentHours ||
      (currentHours === appointmentHours &&
        currentMinutes >= appointmentMinutes)
    ) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            "You cannot start the appointment before the scheduled time."
          )
        );
    }

    // check appointment status is ongoing or not

    if (appointment.appointmentStatus === "Ongoing" && worker) {
      return res
        .status(400)
        .json(new ApiResponse(400, "Appointment is already ongoing"));
    }

    // Update appointment if conditions are met
    if (
      appointment.appointmentStatus === "Accepted" &&
      appointment.appointmentHistory.length > 0
    ) {
      appointment.appointmentStatus = "Ongoing";
      appointment.estimatedTime = estimateTime;
      appointment.startTime = getCurrentFormattedTime();

      appointment.appointmentHistory.unshift({
        status: "Ongoing",
        remarks: "Worker started work on the appointment.",
      });

      await appointment.save({ validateBeforeSave: false });
    }

    console.log(getCurrentFormattedTime());

    // Update worker's status
    if (worker && Array.isArray(worker.appointmentHistory)) {
      const appointmentIndex = worker.appointmentHistory.findIndex(
        (history) =>
          history.appointmentId?.toString() === appointment._id?.toString()
      );

      if (appointmentIndex !== -1) {
        const busyUntil = calculateBusyUntil(estimateTime);

        worker.appointmentHistory[appointmentIndex].appointmentStatus =
          appointment.appointmentStatus;
        worker.appointmentHistory[appointmentIndex].startTime =
          appointment.startTime;
        worker.isBusy = true;
        worker.busyUntil = busyUntil;

        await worker.save({ validateBeforeSave: false });
      } else {
        console.log("No matching appointment found in worker history");
      }
    }

    // Send email notification

    const message = `
  
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background-color: #1a1a1a; border-radius: 8px; color: #e0e0e0;">
    <h2 style="text-align: center; color: #00d1b2;">🔧 Work Started</h2>
    <p style="text-align: center; font-size: 16px; margin-bottom: 10px;">Dear ${
      appointment.userData.fullname
    },</p>
    <p style="text-align: center; font-size: 14px; margin-bottom: 20px;">
        Your worker, <strong style="color: #f39c12;">${
          worker.fullname
        }</strong>, has started working on your appointment. 
        The estimated completion time is <strong style="color: #00d1b2;">${
          estimateTime.split(" ")[0]
        } minutes</strong>.
    </p>

    <div style="background-color: #333; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
        <p style="font-size: 14px; margin: 5px 0;"><strong>Service:</strong> ${
          worker.skill
        }</p>
        <p style="font-size: 14px; margin: 5px 0;"><strong>Worker:</strong> ${
          worker.fullname
        }</p>
        <p style="font-size: 14px; margin: 5px 0;"><strong>Start Time:</strong> ${
          appointment.startTime
        }</p>
        <p style="font-size: 14px; margin: 5px 0;"><strong>Busy Until:</strong> ${
          worker.busyUntil
        }</p>
        <p style="font-size: 14px; margin: 5px 0;"><strong>Address:</strong> ${
          appointment.userData.address.address
        }, ${appointment.userData.address.city}, ${
      appointment.userData.address.state
    }, ${appointment.userData.address.country}</p>
    </div>

    <p style="text-align: center; font-size: 12px; color: #888;">
        For any questions or support, contact us at: 
        <a href="mailto:support@workeasy.com" style="color: #00d1b2; text-decoration: none;">support@workeasy.com</a>
    </p>
    <p style="text-align: center; font-size: 12px; margin-top: 10px; color: #555;">
        Thank you for choosing WorkEasy!
    </p>
</div>


  `;

    await sendMail({
      to: appointment.userData.email,
      subject: `Appointment started at ${getCurrentFormattedTime()}`,
      text: message,
    });

    const newAppointment = await AppointmentModel.findById(appointment._id);

    return res.status(200).json(
      new ApiResponse(200, "Appointment status changed successfully", {
        newAppointment,
        worker,
      })
    );
  } catch (error) {
    console.error("Error in toStartWorkAppointment:", error);
    return res.status(500).json(new ApiResponse(500, "Internal server error"));
  }
});

// Helper function to get the current formatted time
const getCurrentFormattedTime = () => {
  return new Date(Date.now()).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

// Helper function to calculate busyUntil time
const calculateBusyUntil = (estimateTime) => {
  const minutes = parseInt(estimateTime);
  const busyUntil = new Date(Date.now() + minutes * 60000);
  const formattedHours = busyUntil.getHours() % 12 || 12;
  const minutesFormatted = busyUntil.getMinutes().toString().padStart(2, "0");
  const ampm = busyUntil.getHours() >= 12 ? "PM" : "AM";
  return `${formattedHours}:${minutesFormatted} ${ampm}`;
};

// auto cancel appointment after accepting appointment within 20 minutes

cron.schedule(
  "* * * * *",
  asyncHandler(async (req, res) => {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - 20 * 60000); // 10 minutes ago
    const todayDate = new Date().toISOString().split("T")[0];

    const appointments = await AppointmentModel.find({
      appointmentStatus: "Accepted",
      appointmentHistory: {
        $elemMatch: {
          status: "Accepted",
        },
      },
      appointmentDate: todayDate,
      appointmentAcceptedDate: { $lte: cutoffTime },
    });

    console.log("appointments", appointments);

    for (let appointment of appointments) {
      const worker = await WorkerModel.findById(appointment.workerId).select(
        "-password"
      );

      console.log("worker", worker);

      // Cancel the appointment and update the status
      appointment.appointmentStatus = "Cancelled";
      appointment.cancelled = true;
      appointment.cancellationReason =
        "Worker accepted appointment but did not start work on appointment";
      appointment.cancellationDate = Date.now();
      appointment.appointmentHistory.unshift({
        status: "Cancelled",
        remarks: "Appointment Cancelled by System",
        date: new Date(),
      });

      await appointment.save({ validateBeforeSave: false });

      if (
        worker &&
        Array.isArray(worker.appointmentHistory) &&
        worker.appointmentHistory.length > 0
      ) {
        // Find the specific appointment in the worker's history
        const appointmentIndex = worker.appointmentHistory.findIndex(
          (history) =>
            history.appointmentId?.toString() === appointment._id?.toString()
        );

        if (appointmentIndex !== -1) {
          console.log("Worker found and appointment matched");

          worker.appointmentHistory[appointmentIndex].appointmentStatus =
            appointment.appointmentStatus;
          worker.appointmentHistory[appointmentIndex].cancelled = true;
          worker.appointmentHistory[appointmentIndex].cancellationReason =
            appointment.cancellationReason;

          await worker.save({
            validateBeforeSave: false,
          });
        } else {
          console.log("No matching appointment found in worker history");
        }
      }

      const message = `
        <div style="background-color: #121212; color: #e5e5e5; font-family: Arial, sans-serif; line-height: 1.6; padding: 20px;">
          <div style="max-width: 600px; margin: auto; background-color: #1e1e1e; padding: 20px; border-radius: 10px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
            <h2 style="text-align: center; color: #ff4d4f; font-size: 24px; margin-bottom: 10px;">🚫 Appointment Status Cancelled</h2>
            <p style="margin: 10px 0; font-size: 16px; color: #b0b0b0;">
              Hello <span style="color: #34d399; font-weight: bold;">${appointment.userData.fullname}</span>,
            </p>
            <p style="margin: 10px 0; font-size: 16px; color: #b0b0b0;">
              We regret to inform you that your appointment for the service <span style="color: #ff4d4f; font-weight: bold;">${worker.skill}</span> 
              scheduled on <span style="color: #ff4d4f; font-weight: bold;">${appointment.appointmentDate}</span> at 
              <span style="color: #ff4d4f; font-weight: bold;">${appointment.appointmentTime}</span> has been <span style="color: #ff4d4f; font-weight: bold;">cancelled</span>.
            </p>
            <div style="background-color: #292929; padding: 10px; border-radius: 8px; margin: 10px 0; color: #a0a0a0;">
              <p><strong>Service:</strong> ${worker.skill}</p>
              <p><strong>Worker:</strong> ${worker.fullname}</p>
              <p><strong>Date:</strong> ${appointment.appointmentDate}</p>
              <p><strong>Time:</strong> ${appointment.appointmentTime}</p>
              <p><strong>Reason:</strong> ${appointment.cancellationReason}</p>
            </div>
            <p style="margin: 10px 0; font-size: 16px; color: #b0b0b0;">
              We apologize for any inconvenience caused. If you have any questions or need assistance, please contact us at 
              <a href="mailto:support@workeasy.com" style="color: #34d399; text-decoration: none;">support@workeasy.com</a>.
            </p>
            <hr style="border: 0; border-top: 1px solid #444; margin: 15px 0;">
            <p style="text-align: center; color: #777; font-size: 12px;">
              Thank you for choosing WorkEasy. We are here to help you anytime!
            </p>
          </div>
        </div>
      `;

      // Sending emails to both the user and the worker
      await sendMail({
        to: appointment.userData.email,
        subject: "Appointment Cancelled",
        text: message,
      });

      await sendMail({
        to: worker.email,
        subject: "Appointment Cancelled",
        text: message,
      });
    }

    return res.status(200).json(
      new ApiResponse(200, "Appointment Cancelled Successfully", {
        appointments,
        worker,
      })
    );
  })
);

module.exports = {
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
};
