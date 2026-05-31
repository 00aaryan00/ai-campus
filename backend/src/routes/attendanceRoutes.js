const express = require("express");
const router = express.Router();

const {
  getFacultyTests,
  getTestStudents,
  submitAttendance,
  getStudentSummary,
} = require("../controllers/attendanceController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

// Faculty routes
router.get("/faculty/tests", getFacultyTests);
router.get("/faculty/test-students/:testId", getTestStudents);
router.post("/submit", submitAttendance);

// Student routes
router.get("/student/summary", getStudentSummary);

// Triggering nodemon restart again
module.exports = router;
