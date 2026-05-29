const mongoose = require("mongoose");

const timetableSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institution",
      required: true,
      index: true,
    },
    dayOfWeek: {
      type: String,
      enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      required: true,
    },
    startTime: {
      type: String, // e.g. "10:00 AM" or "10:00"
      required: true,
    },
    endTime: {
      type: String, // e.g. "11:00 AM" or "11:00"
      required: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    room: {
      type: String,
      required: true,
      trim: true,
    },
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    semester: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

timetableSchema.index({ institutionId: 1, department: 1, semester: 1, dayOfWeek: 1 });

module.exports = mongoose.model("Timetable", timetableSchema);
