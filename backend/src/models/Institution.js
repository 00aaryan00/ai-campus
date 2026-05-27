const mongoose = require("mongoose");

const institutionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
      index: true,
    },
    domains: {
      type: [String],
      default: [],
    },
    authMode: {
      type: String,
      enum: ["email_domain", "roster_based"],
      default: "email_domain",
    },
    onboardingStatus: {
      type: String,
      enum: ["active", "paused"],
      default: "active",
    },
    branding: {
      displayName: { type: String, default: "" },
      logoUrl: { type: String, default: "" },
      primaryColor: { type: String, default: "" },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Institution", institutionSchema);
