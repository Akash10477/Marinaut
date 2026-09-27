const express = require("express");
const router = express.Router();
const c = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

// Vessel Owner portal
router.post("/register", c.registerOwner);
router.post("/login", c.loginOwner);

// Naval Police portal
router.post("/police/register", c.registerPolice);
router.post("/police/login", c.loginPolice);

// Admin portal
router.post("/admin/register", c.registerAdmin);
router.post("/admin/login", c.loginAdmin);

router.get("/me", protect, c.getMe);

module.exports = router;
