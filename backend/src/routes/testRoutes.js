const express = require("express");

const {
  createTest,
  generateQuestionsFromAI,
  getTests,
  deleteTest,
  joinTestByCode,
  saveDraftTest,
  startTest,
  updateTestDraft,
  publishTest,
  toggleRoomAccess,
} = require("../controllers/testController");
const { protect } = require("../middleware/authMiddleware");
const { createTestWriteLimiter } = require("../middleware/rateLimitMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(protect);

router.post("/save-draft", createTestWriteLimiter, authorizeRoles("faculty"), saveDraftTest);
router.put("/:id", createTestWriteLimiter, authorizeRoles("faculty"), updateTestDraft);
router.put("/:id/publish", authorizeRoles("faculty"), publishTest);
router.put("/:id/room-access", authorizeRoles("faculty"), toggleRoomAccess);

router.get("/", authorizeRoles("faculty"), getTests);
router.delete("/:id", authorizeRoles("faculty"), deleteTest);
router.post("/create", createTestWriteLimiter, authorizeRoles("faculty"), createTest);
router.post("/ai/generate", createTestWriteLimiter, authorizeRoles("faculty"), generateQuestionsFromAI);
router.post("/join-by-code", authorizeRoles("student"), joinTestByCode);
router.post("/:id/start", authorizeRoles("student"), startTest);

module.exports = router;
