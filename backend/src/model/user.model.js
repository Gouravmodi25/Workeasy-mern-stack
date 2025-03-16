const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const addressSchema = new mongoose.Schema({
  landmark: { type: String },
  city: { type: String },
  state: { type: String },
  address: { type: String },
  country: { type: String },
});

const userSchema = new mongoose.Schema(
  {
    // for necessary fields
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    fullname: {
      type: String,
      required: true,
      minlength: 3,
    },
    phoneNumber: {
      type: String,
      unique: true,
      sparse: true,
      required: true,
    },

    // OTP & Verification
    otp: {
      type: String,
      select: false,
    },
    otpExpires: {
      type: Date,
      select: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },

    // for profile details
    gender: {
      type: String,
      enum: ["Male", "Female", "Transgender", "Other"],
    },
    dob: {
      type: Date,
    },
    avatarImage: {
      type: String,
    },

    //   for tokens
    accessToken: {
      type: String,
      select: false,
    },
    refreshToken: {
      type: String,
      select: false,
    },

    //   for reset password token
    resetPasswordOtp: {
      type: String,
    },
    resetPasswordOtpExpiry: {
      type: String,
    },

    isResetOtpVerified: {
      type: Boolean,
    },

    resetPasswordToken: {
      type: String,
    },
    resetPasswordTokenExpiry: {
      type: String,
    },

    //   for address schema
    address: addressSchema,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// for age calculation
userSchema.virtual("age").get(function () {
  if (this.dob) {
    const diff = new Date() - new Date(this.dob);
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  }
  return null;
});

// for password hashing
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// for correct password
userSchema.methods.isCorrectPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// is Same Password
userSchema.methods.isSamePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// generate access token
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      id: this._id,
      email: this.email,
      username: this.username,
      email: this.email,
      fullname: this.fullname,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};

// generate reset password token

userSchema.methods.generateResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.resetPasswordTokenExpiry = Date.now() + 10 * (60 * 1000);
  return resetToken;
};

// generate refresh token
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

const UserModel = mongoose.model("User", userSchema);

module.exports = UserModel;
