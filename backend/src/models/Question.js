const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Test",
      required: true,
      index: true,
    },
    setType: {
      type: String,
      enum: ["common", "easy", "medium", "hard"],
      required: true,
      index: true,
    },
    questionText: {
      type: String,
      required: true,
      trim: true,
    },
    options: {
      type: [String],
      default: [],
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length >= 2 && value.every((item) => typeof item === "string" && item.trim());
        },
        message: "Options must contain at least 2 non-empty strings",
      },
    },
    correctAnswer: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator(value) {
          return Array.isArray(this.options) && this.options.includes(value);
        },
        message: "correctAnswer must be one of the provided options",
      },
    },
    marks: {
      type: Number,
      default: 1,
      min: 1,
    },
    type: {
      type: String,
      enum: ["mcq"],
      default: "mcq",
    },
    difficultyLevel: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    topic: {
      type: String,
      trim: true,
      default: "",
    },
    source: {
      type: String,
      enum: ["ai", "manual"],
      default: "manual",
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

questionSchema.index({ testId: 1, setType: 1 });

module.exports = mongoose.model("Question", questionSchema);
