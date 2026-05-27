const express = require("express");

const {
  loginSuperAdmin,
  getPlatformMe,
  createInstitutionWithAdmin,
} = require("../controllers/platformController");
const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

router.post("/auth/login", loginSuperAdmin);
router.get("/auth/me", protect, authorizeRoles("super_admin"), getPlatformMe);
router.post(
  "/institutions",
  protect,
  authorizeRoles("super_admin"),
  createInstitutionWithAdmin
);

module.exports = router;

