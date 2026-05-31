const express = require("express");
const router = express.Router({ mergeParams: true });
const {
  applyLeave,
  getMyLeaves,
  getDepartmentLeaves,
  getAllLeaves,
  updateLeaveStatus
} = require("../controllers/leaveController");
const { protect } = require("../middleware/authMiddleware");
const tenantMiddleware = require("../middleware/tenantMiddleware");
const multer = require("multer");

// Configure multer for memory storage (file buffer goes to ImageKit)
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.use(tenantMiddleware.resolveTenantFromSlug);
router.use(protect);

router.post("/apply", upload.single("file"), applyLeave);
router.get("/my-leaves", getMyLeaves);
router.get("/department-leaves", getDepartmentLeaves);
router.get("/all-leaves", getAllLeaves);
router.patch("/:id/status", updateLeaveStatus);

module.exports = router;
// Triggering nodemon restart
