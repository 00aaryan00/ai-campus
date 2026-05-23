const mongoose = require("mongoose");

const analyticsStudentTestFactSchema = new mongoose.Schema(
  {
    resultId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Result",
      required: true,
      unique: true,
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
    facultyNameSnapshot: {
      type: String,
      default: "",
      trim: true,
    },
    subject: {
      type: String,
      default: "",
      trim: true,
    },
    score: {
      type: Number,
      default: 0,
    },
    totalMarks: {
      type: Number,
      default: 0,
    },
    accuracy: {
      type: Number,
      default: 0,
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
    collection: "analytics_student_test_facts",
  }
);

analyticsStudentTestFactSchema.index({ studentId: 1, submittedAt: -1 });
analyticsStudentTestFactSchema.index({ testId: 1, submittedAt: -1 });
analyticsStudentTestFactSchema.index({ facultyId: 1, submittedAt: -1 });
analyticsStudentTestFactSchema.index({ facultyDepartment: 1, submittedAt: -1 });

module.exports = mongoose.model("AnalyticsStudentTestFact", analyticsStudentTestFactSchema);
