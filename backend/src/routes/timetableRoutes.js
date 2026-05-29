const express = require("express");

const {
  bulkSaveTimetable,
  getMySchedule,
} = require("../controllers/timetableController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect); // All routes require authentication

router.post("/bulk", bulkSaveTimetable);
router.get("/my-schedule", getMySchedule);

module.exports = router;
