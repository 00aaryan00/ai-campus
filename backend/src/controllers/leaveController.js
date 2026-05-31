const Leave = require("../models/Leave");
const imagekit = require("../config/imagekit");

const applyLeave = async (req, res) => {
  try {
    const { reason, fromDate, toDate } = req.body;
    const { _id: studentId, name: studentName, department, semester, institutionId } = req.user;

    if (!reason || !fromDate || !toDate) {
      return res.status(400).json({ success: false, message: "Reason, fromDate, and toDate are required." });
    }

    if (req.user.role !== "student") {
      return res.status(403).json({ success: false, message: "Only students can apply for leave." });
    }

    let fileUrl = "";
    if (req.file) {
      try {
        const response = await imagekit.upload({
          file: req.file.buffer.toString("base64"),
          fileName: req.file.originalname,
          folder: "/ai_campus_leaves",
        });
        fileUrl = response.url;
      } catch (uploadError) {
        console.error("ImageKit upload error:", uploadError);
        return res.status(500).json({ success: false, message: "File upload failed." });
      }
    }

    const leave = new Leave({
      studentId,
      studentName,
      institutionId,
      department,
      semester,
      reason,
      fromDate,
      toDate,
      fileUrl,
    });

    await leave.save();

    res.status(201).json({ success: true, message: "Leave applied successfully", leave });
  } catch (error) {
    console.error("Error applying leave:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

const getMyLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find({ studentId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, leaves });
  } catch (error) {
    console.error("Error fetching student leaves:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

const getDepartmentLeaves = async (req, res) => {
  try {
    if (req.user.role !== "hod") {
      return res.status(403).json({ success: false, message: "Only HODs can view department leaves." });
    }
    const leaves = await Leave.find({
      institutionId: req.tenant ? req.tenant._id : req.user.institutionId,
      department: new RegExp(`^${req.user.department}$`, "i")
    }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, leaves });
  } catch (error) {
    console.error("Error fetching department leaves:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

const getAllLeaves = async (req, res) => {
  try {
    if (req.user.role !== "institution_admin") {
      return res.status(403).json({ success: false, message: "Only principals can view all leaves." });
    }
    const leaves = await Leave.find({
      institutionId: req.tenant ? req.tenant._id : req.user.institutionId,
    }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, leaves });
  } catch (error) {
    console.error("Error fetching all leaves:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

const updateLeaveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (req.user.role !== "hod" && req.user.role !== "institution_admin") {
      return res.status(403).json({ success: false, message: "Unauthorized to update leave status." });
    }

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status." });
    }

    const leave = await Leave.findById(id);
    if (!leave) {
      return res.status(404).json({ success: false, message: "Leave request not found." });
    }

    // Optional: verify HOD department matches leave department
    if (req.user.role === "hod") {
      if (leave.department.toLowerCase() !== (req.user.department || "").toLowerCase()) {
         return res.status(403).json({ success: false, message: "Unauthorized to update leaves for another department." });
      }
    }

    leave.status = status;
    leave.actionBy = req.user._id;
    await leave.save();

    res.status(200).json({ success: true, message: `Leave ${status.toLowerCase()} successfully`, leave });
  } catch (error) {
    console.error("Error updating leave status:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

module.exports = {
  applyLeave,
  getMyLeaves,
  getDepartmentLeaves,
  getAllLeaves,
  updateLeaveStatus
};
