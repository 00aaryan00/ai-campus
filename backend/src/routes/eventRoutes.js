const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { protect } = require("../middleware/authMiddleware");
const { createEvent, getEvents, deleteEvent } = require("../controllers/eventController");

const router = express.Router({ mergeParams: true });

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

router.use(protect);

router.get("/", getEvents);
router.post("/", upload.single("file"), createEvent);
router.delete("/:eventId", deleteEvent);

module.exports = router;
