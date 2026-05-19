const rateLimit = require("express-rate-limit");

const createTestWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many test-management requests. Please try again later.",
  },
});

module.exports = {
  createTestWriteLimiter,
};
