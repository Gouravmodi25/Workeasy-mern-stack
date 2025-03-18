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

  if (!isVerified) {
    return res
      .status(401)
      .json(new ApiResponse(400, "Please verify the profile with otp"));
  }

  const { _id } = req.worker;

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




module.exports = {
  signupWorker,
  otpVerification,
  resendOtp,
  completeProfileDetailsWorker,
};
