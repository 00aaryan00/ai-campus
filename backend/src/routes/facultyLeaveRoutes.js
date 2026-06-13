const express = require("express");
const router = express.Router({ mergeParams: true });
const {
  applyLeave,
  getMyLeaves,
  getDepartmentLeaves,
  updateLeaveStatus,
  getInstitutionHodLeaves,
} = require("../controllers/facultyLeaveController");
const { protect } = require("../middleware/authMiddleware");
const tenantMiddleware = require("../middleware/tenantMiddleware");
const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.use(tenantMiddleware.resolveTenantFromSlug);

// Apply for a leave (Faculty/HOD)
router.post("/apply", protect, upload.single("file"), applyLeave);

// Get logged-in faculty/HOD's leaves
router.get("/my-leaves", protect, getMyLeaves);

// Get all faculty leaves for the department (HOD / Principal)
router.get("/department-leaves", protect, getDepartmentLeaves);

// Get all HOD leaves (Principal)
router.get("/hod-leaves", protect, getInstitutionHodLeaves);

// Approve/Reject faculty/HOD leave
router.patch("/:leaveId/status", protect, updateLeaveStatus);

module.exports = router;
