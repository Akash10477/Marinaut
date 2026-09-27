const express = require("express");
const router = express.Router();
const c = require("../controllers/fineController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/", c.getFines);
router.post("/", authorize("police", "admin"), c.issueFine);
router.get("/:id", c.getFineById);
router.patch("/:id/cancel", authorize("admin"), c.cancelFine);

module.exports = router;
