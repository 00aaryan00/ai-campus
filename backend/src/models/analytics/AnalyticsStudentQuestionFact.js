const mongoose = require("mongoose");

const analyticsStudentQuestionFactSchema = new mongoose.Schema(
  {
    resultId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Result",
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Test",
      required: true,
      index: true,
    },
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    facultyDepartment: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      required: true,
      index: true,
    },
    topic: {
      type: String,
      default: "",
      trim: true,
    },
    difficulty: {
      type: String,
      default: "",
      trim: true,
    },
    correct: {
      type: Boolean,
      required: true,
    },
    selectedAnswer: {
      type: String,
      default: "",
      trim: true,
    },
    assignedSet: {
      type: String,
      default: "",
      trim: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: "analytics_student_question_facts",
  }
);

analyticsStudentQuestionFactSchema.index({ resultId: 1, questionId: 1 }, { unique: true });
analyticsStudentQuestionFactSchema.index({ studentId: 1, submittedAt: -1 });
analyticsStudentQuestionFactSchema.index({ topic: 1, submittedAt: -1 });
analyticsStudentQuestionFactSchema.index({ facultyId: 1, submittedAt: -1 });
analyticsStudentQuestionFactSchema.index({ facultyDepartment: 1, submittedAt: -1 });

module.exports = mongoose.model("AnalyticsStudentQuestionFact", analyticsStudentQuestionFactSchema);
