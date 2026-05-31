const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    studentName: { type: String, required: true },
    institutionId: { type: mongoose.Schema.Types.ObjectId, ref: "Institution", required: true },
    department: { type: String, required: true, trim: true },
    semester: { type: String, trim: true },
    reason: { type: String, required: true },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    fileUrl: { type: String }, // For uploaded medical certificates etc.
    status: { 
      type: String, 
      enum: ["Pending", "Approved", "Rejected"], 
      default: "Pending" 
    },
    actionBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // HOD or Principal who acted on it
  },
  { timestamps: true }
);

module.exports = mongoose.model("Leave", leaveSchema);
