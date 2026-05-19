const express = require("express");

const { submitTest, getMyResults } = require("../controllers/resultController");
const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(protect);
router.use(authorizeRoles("student"));

router.post("/submit", submitTest);
router.get("/my-results", getMyResults);

module.exports = router;
