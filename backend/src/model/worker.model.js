const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const { Schema } = mongoose;

// address schema
const addressSchema = new mongoose.Schema({
  landmark: { type: String },
  city: { type: String },
  state: { type: String },
  address: { type: String },
  country: { type: String },
});

// rating schema

const ratingSchema = new mongoose.Schema({
  rating: {
    type: Number,
    min: 0,
    max: 5,
    required: true,
  },
  review: { type: String },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Appointment",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// appointment history schema

const appointmentHistorySchema = new mongoose.Schema({
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Appointment",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Worker",
    required: true,
  },
  appointmentDate: {
    type: Date,
    required: true,
  },
  appointmentTime: {
    type: String,
    required: true,
  },
  charges: {
    type: Number,
    required: true,
  },
  visitationFees: {
    type: Number,
    required: true,
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
  timeOfCompletion: {
    type: Date,
  },
  startTime: {
    type: Date,
  },
  cancelled: {
    type: Boolean,
    default: false,
  },
  reachTime: {
    type: Date,
  },
  cancellationReason: {
    type: String,
    default: null,
  },
  paymentStatus: {
    type: String,
    enum: ["Pending", "Completed", "Failed"],
    default: "Pending",
  },
  refundInitiated: {
    type: Boolean,
    default: false,
  },
  refundDetails: {
    type: Object,
    of: String,
    default: {},
  },
  appointmentStatus: {
    type: String,
    enum: ["Scheduled", "Accepted", "Ongoing", "Completed", "Cancelled"],
    index: true,
  },
  estimatedTime: {
    type: String,
  },
  remarks: {
    type: String,
  },
  paymentId: {
    type: String,
    default: null,
  },
});

const workerSchema = new Schema(
  {
    // necessary fields
    email: {
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

    //   otp verification

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

    // busy status

    busyUntil: {
      type: String,
    },

    isBusy: {
      type: Boolean,
      default: false,
    },

    //   for profile details

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
    skill: {
      type: String,
    },
    experience: {
      type: Number,
      default: 0,
    },
    charges: {
      type: Number,
    },
    availability: {
      type: String,
      default: "Available",
      enum: ["Available", "Unavailable", "On Leave", "On Work"],
    },
    visitationFees: {
      type: Number,
    },

    about: {
      type: String,
      maxlength: 500,
    },

    //  for rating

    rating: [ratingSchema],

    //   for appointment history

    appointmentHistory: [appointmentHistorySchema],

    // total reviews

    totalReviews: {
      type: Number,
      default: 0,
    },

    // total earnings

    totalEarnings: {
      type: Number,
      default: 0,
    },

    //   address
    address: addressSchema,

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

    //   for tokens
    accessToken: {
      type: String,
      select: false,
    },
    refreshToken: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// for age calculation
workerSchema.virtual("age").get(function () {
  if (this.dob) {
    const diff = new Date() - new Date(this.dob);
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  }
  return null;
});

// for password hashing
workerSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// for correct password
workerSchema.methods.isCorrectPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// is Same Password
workerSchema.methods.isSamePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// generate access token
workerSchema.methods.generateAccessToken = function () {
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

workerSchema.methods.generateResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.resetPasswordTokenExpiry = Date.now() + 10 * (60 * 1000);
  return resetToken;
};

// generate refresh token
workerSchema.methods.generateRefreshToken = function () {
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

// create model of worker

const WorkerModel = mongoose.model("Worker", workerSchema);

module.exports = WorkerModel;
