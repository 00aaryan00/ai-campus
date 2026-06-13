const FacultyLeave = require("../models/FacultyLeave");

const applyLeave = async (req, res) => {
  try {
    const { reason, fromDate, toDate } = req.body;
    const { _id: facultyId, name: facultyName, department, institutionId, role } = req.user;

    if (!reason || !fromDate || !toDate) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    if (role !== "faculty" && role !== "hod") {
      return res.status(403).json({ success: false, message: "Only faculty can apply for this leave." });
    }

    let fileUrl = null;
    if (req.file) {
      // Logic for handling file upload if implemented
      fileUrl = req.file.path;
    }

    const leave = new FacultyLeave({
      facultyId,
      facultyName,
      institutionId,
      department,
      reason,
      fromDate,
      toDate,
      fileUrl,
      applicantRole: role,
    });

    await leave.save();

    res.status(201).json({ success: true, message: "Leave applied successfully.", leave });
  } catch (error) {
    console.error("Error applying faculty leave:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

const getMyLeaves = async (req, res) => {
  try {
    const leaves = await FacultyLeave.find({ facultyId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, leaves });
  } catch (error) {
    console.error("Error fetching faculty leaves:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

const getDepartmentLeaves = async (req, res) => {
  try {
    if (req.user.role !== "hod" && req.user.role !== "principal") {
      return res.status(403).json({ success: false, message: "Only HOD or Principal can view department faculty leaves." });
    }
    
    // HOD can see their department, Principal can see all (or pass department in query)
    const filter = { institutionId: req.user.institutionId };
    
    if (req.user.role === "hod") {
      filter.department = new RegExp(`^${req.user.department}$`, "i");
    }

    const leaves = await FacultyLeave.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ success: true, leaves });
  } catch (error) {
    console.error("Error fetching department faculty leaves:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

const updateLeaveStatus = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { status } = req.body;

    if (req.user.role !== "hod" && req.user.role !== "principal") {
      return res.status(403).json({ success: false, message: "Only HOD or Principal can update faculty leave status." });
    }

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status." });
    }

    const leave = await FacultyLeave.findById(leaveId);
    if (!leave) return res.status(404).json({ success: false, message: "Leave not found." });

    if (req.user.role === "hod" && leave.department.toLowerCase() !== (req.user.department || "").toLowerCase()) {
       return res.status(403).json({ success: false, message: "You can only update leaves from your department." });
    }

    leave.status = status;
    leave.actionBy = req.user._id;
    await leave.save();

    res.status(200).json({ success: true, message: `Leave ${status.toLowerCase()} successfully.`, leave });
  } catch (error) {
    console.error("Error updating faculty leave status:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

const getInstitutionHodLeaves = async (req, res) => {
  try {
    if (req.user.role !== "principal" && req.user.role !== "institution_admin") {
      return res.status(403).json({ success: false, message: "Only Principal can view all HOD leaves." });
    }
    
    const filter = { institutionId: req.user.institutionId, applicantRole: "hod" };
    const leaves = await FacultyLeave.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ success: true, leaves });
  } catch (error) {
    console.error("Error fetching HOD leaves:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

module.exports = {
  applyLeave,
  getMyLeaves,
  getDepartmentLeaves,
  updateLeaveStatus,
  getInstitutionHodLeaves,
};
