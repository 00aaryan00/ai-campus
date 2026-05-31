const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const {
  getStudentDashboardStats,
  getFacultyDashboardStats,
  getPrincipalDashboardStats,
} = require("../controllers/dashboardController");

const router = express.Router({ mergeParams: true });

router.use(protect);

router.get("/student", authorizeRoles("student"), getStudentDashboardStats);
router.get("/faculty", authorizeRoles("faculty"), getFacultyDashboardStats);
router.get("/principal", authorizeRoles("institution_admin", "super_admin", "hod"), getPrincipalDashboardStats);

module.exports = router;
