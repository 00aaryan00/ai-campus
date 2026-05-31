const mongoose = require("mongoose");

const attendanceSessionSchema = new mongoose.Schema(
  {
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Test",
      required: true,
      unique: true, // Only one attendance session per test
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institution",
      default: null,
      index: true,
    },
    presentStudents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    absentStudents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Helpful index to get sessions by date and institution
attendanceSessionSchema.index({ date: -1, institutionId: 1 });

module.exports = mongoose.model("AttendanceSession", attendanceSessionSchema);
