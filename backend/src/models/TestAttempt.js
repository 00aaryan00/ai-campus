const mongoose = require("mongoose");

const testAttemptSchema = new mongoose.Schema(
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
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Test",
      required: true,
      index: true,
    },
    assignedSet: {
      type: String,
      enum: ["common", "easy", "medium", "hard"],
      required: true,
    },
    roomCodeSnapshot: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },
    status: {
      type: String,
      enum: ["in_progress", "submitted", "expired"],
      default: "in_progress",
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

testAttemptSchema.index(
  { studentId: 1, testId: 1 },
  {
    unique: true,
  }
);

module.exports = mongoose.model("TestAttempt", testAttemptSchema);
