const express = require("express");

const {
  createTest,
  getTests,
  joinTestByCode,
  saveDraftTest,
  startTest,
  updateTestDraft,
} = require("../controllers/testController");
const { protect } = require("../middleware/authMiddleware");
const { createTestWriteLimiter } = require("../middleware/rateLimitMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(protect);

//router.post("/save-draft", createTestWriteLimiter, authorizeRoles("faculty"), saveDraftTest);
//router.put("/:id", createTestWriteLimiter, authorizeRoles("faculty"), updateTestDraft);
router.post("/create", createTestWriteLimiter, authorizeRoles("faculty"), createTest);
router.post("/join-by-code", authorizeRoles("student"), joinTestByCode);
router.post("/:id/start", authorizeRoles("student"), startTest);

module.exports = router;
