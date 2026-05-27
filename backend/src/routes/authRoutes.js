const express = require("express");

const {
  registerUser,
  signupRequest,
  loginUser,
  getCurrentUser,
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");
const { authLimiter } = require("../middleware/rateLimitMiddleware");

const router = express.Router();

router.post("/register", registerUser);
router.post("/signup-request", authLimiter, signupRequest);
router.post("/login", authLimiter, loginUser);
router.get("/me", protect, getCurrentUser);

module.exports = router;
