const express = require("express");

const {
  uploadRoster,
  listRoster,
  updateRosterEntry,
  listUsers,
  updateUser,
  setUserStatus,
} = require("../controllers/adminController");
const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(protect);
router.use(authorizeRoles("institution_admin"));

router.post("/roster/upload", uploadRoster);
router.get("/roster", listRoster);
router.patch("/roster/:id", updateRosterEntry);
router.get("/users", listUsers);
router.patch("/users/:id", updateUser);
router.patch("/users/:id/status", setUserStatus);

module.exports = router;
