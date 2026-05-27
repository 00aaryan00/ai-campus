const mongoose = require("mongoose");

const rosterRoles = ["student", "faculty", "hod"];

const rosterEntrySchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institution",
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    enrollmentNumber: {
      type: String,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      trim: true,
      default: "",
    },
    role: {
      type: String,
      enum: rosterRoles,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

rosterEntrySchema.index({ institutionId: 1, email: 1 }, { unique: true });
rosterEntrySchema.index(
  { institutionId: 1, enrollmentNumber: 1 },
  {
    name: "uniq_institution_enrollment_student_only",
    unique: true,
    partialFilterExpression: {
      enrollmentNumber: { $exists: true },
    },
  }
);

module.exports = mongoose.model("RosterEntry", rosterEntrySchema);
