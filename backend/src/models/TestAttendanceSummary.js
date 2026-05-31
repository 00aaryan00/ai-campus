const mongoose = require("mongoose");

const testAttendanceSummarySchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institution",
      default: null,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    totalTests: {
      type: Number,
      default: 0,
      min: 0,
    },
    attendedTests: {
      type: Number,
      default: 0,
      min: 0,
    },
    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to quickly find a student's summary for a specific subject
testAttendanceSummarySchema.index({ studentId: 1, subject: 1 }, { unique: true });

// Pre-save hook to calculate the percentage dynamically based on attended vs total
testAttendanceSummarySchema.pre("save", function (next) {
  if (this.totalTests > 0) {
    this.percentage = Math.round((this.attendedTests / this.totalTests) * 100);
  } else {
    this.percentage = 0;
  }
  next();
});

module.exports = mongoose.model("TestAttendanceSummary", testAttendanceSummarySchema);
