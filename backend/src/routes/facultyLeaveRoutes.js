const express = require("express");
const router = express.Router({ mergeParams: true });
const {
  applyLeave,
  getMyLeaves,
  getDepartmentLeaves,
  updateLeaveStatus,
} = require("../controllers/facultyLeaveController");
const { protect } = require("../middleware/authMiddleware");
const tenantMiddleware = require("../middleware/tenantMiddleware");
const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.use(tenantMiddleware.resolveTenantFromSlug);

// Apply for a leave (Faculty)
router.post("/apply", protect, upload.single("file"), applyLeave);

// Get logged-in faculty's leaves
router.get("/my-leaves", protect, getMyLeaves);

// Get all faculty leaves for the department (HOD / Principal)
router.get("/department-leaves", protect, getDepartmentLeaves);

// Approve/Reject faculty leave
router.patch("/:leaveId/status", protect, updateLeaveStatus);

module.exports = router;
