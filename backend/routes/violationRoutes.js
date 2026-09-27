const express = require("express");
const router = express.Router();
const c = require("../controllers/violationController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/", c.getViolations);
router.post("/", authorize("admin"), c.createViolation);
router.patch("/:id", authorize("admin"), c.updateViolation);
router.delete("/:id", authorize("admin"), c.deleteViolation);

module.exports = router;
