const mongoose = require("mongoose");

const facultyLeaveSchema = new mongoose.Schema(
  {
    facultyId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    facultyName: { type: String, required: true },
    institutionId: { type: mongoose.Schema.Types.ObjectId, ref: "Institution", required: true },
    department: { type: String, required: true, trim: true },
    reason: { type: String, required: true },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    fileUrl: { type: String }, // For uploaded medical certificates etc.
    applicantRole: { type: String, enum: ["faculty", "hod"], default: "faculty" },
    status: { 
      type: String, 
      enum: ["Pending", "Approved", "Rejected"], 
      default: "Pending" 
    },
    actionBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // HOD or Principal who acted on it
  },
  { timestamps: true }
);

module.exports = mongoose.model("FacultyLeave", facultyLeaveSchema);
