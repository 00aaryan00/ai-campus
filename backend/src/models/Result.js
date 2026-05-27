

// studentId
// testId
// attemptId   ← link to TestAttempt
// answers[]   ← detailed answers
// score
// totalMarks
// accuracy




const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    selectedAnswer: {
      type: String,
      default: "",
      trim: true,
    },
    isCorrect: {
      type: Boolean,
      required: true,
    },
    marksAwarded: {
      type: Number,
      required: true,
      min: 0,
    },
    correctAnswer: {
      type: String,
      required: true,
      trim: true,
    },
    topic: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    _id: false,
  }
);

const resultSchema = new mongoose.Schema(
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
    attemptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TestAttempt",
      required: true,
      unique: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    assignedSet: {
      type: String,
      enum: ["common", "easy", "medium", "hard"],
      required: true,
    },
    answers: {
      type: [answerSchema],
      default: [],
    },
    score: {
      type: Number,
      required: true,
      min: 0,
    },
    totalMarks: {
      type: Number,
      required: true,
      min: 0,
    },
    accuracy: {
      type: Number,
      required: true,
      min: 0,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

resultSchema.index({ subject: 1, submittedAt: -1 });

module.exports = mongoose.model("Result", resultSchema);
