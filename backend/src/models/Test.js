const mongoose = require("mongoose");

const testSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    mode: {
      type: String,
      enum: ["common", "adaptive"],
      default: "common",
    },
    duration: {
      type: Number,
      required: true,
      min: 1,
    },
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institution",
      default: null,
      index: true,
    },
    department: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["draft", "published", "closed"],
      default: "draft",
    },
    roomCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
      default: null,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    roomCodeExpiresAt: {
      type: Date,
      default: null,
      index: true,
    },
    instructions: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);



module.exports = mongoose.model("Test", testSchema);
