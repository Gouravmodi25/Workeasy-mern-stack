const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    // for user and worker details

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker",
      required: true,
      index: true,
    },

    workerData: {
      type: Object,
      of: String,
      required: true,
      default: {},
    },
    userData: {
      type: Object,
      of: String,
      required: true,
      default: {},
    },

    // for appointment date and time

    appointmentDate: {
      type: String,
      required: true,
      index: true,
    },

    appointmentTime: {
      type: String,
      required: true,
      index: true,
    },

    appointmentBookedDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    createdAt: {
      type: Date,
      default: Date.now,
      index: true, // For pagination and sorting
    },

    // appointment charges and visitation fees

    charges: {
      type: Number,
      required: true,
      min: 0,
      required: true,
    },

    visitationFees: {
      type: Number,
      required: true,
      min: 0,
      required: true,
    },

    // appointment cancellation status

    cancelled: {
      type: Boolean,
      default: false,
    },
    cancellationReason: {
      type: String,
      default: null,
    },
    cancellationDate: {
      type: Date,
      default: null,
    },

    // about payment status

    payment: {
      type: Boolean,
      default: false,
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Complete", "Failed", "Refunded"],
      default: "Pending",
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    timeOfCompletion: {
      type: Date,
    },
    paymentId: {
      type: String,
      default: null,
    },
    paymentMode: {
      type: String,
      enum: ["Online", "Cash"],
      default: "Online",
    },

    // refund details

    refundInitiated: {
      type: Boolean,
      default: false,
    },
    refundDetails: {
      type: Object,
      of: String,
      default: {},
    },

    //   appointment status

    appointmentStatus: {
      type: String,
      enum: ["Scheduled", "Accepted", "Ongoing", "Completed", "Cancelled"],
      default: "Scheduled",
      index: true,
    },

    appointmentAcceptedDate: {
      type: Date,
      default: null,
    },

    //   appointment feedback

    review: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
        default: null,
      },
      feedback: {
        type: String,
        default: null,
      },
    },

    // estimated time for appointment

    estimatedTime: {
      type: String,
    },

    startTime: {
      type: String,
    },

    // working history of appointment

    appointmentHistory: [
      {
        status: {
          type: String,
          enum: ["Scheduled", "Accepted", "Ongoing", "Completed", "Cancelled"],
          default: "Scheduled",
          index: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        remarks: {
          type: String,
          default: null,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const AppointmentModel = mongoose.model("Appointment", appointmentSchema);

module.exports = AppointmentModel;
