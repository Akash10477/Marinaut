const express = require("express");
const router = express.Router();
const c = require("../controllers/vesselController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/", c.getVessels);
router.post("/", c.addVessel);
router.post("/add", c.addVessel); // old URL kept for compatibility
router.get("/:id", c.getVesselById);
router.patch("/:id", c.updateVessel);
router.patch("/:id/status", authorize("admin"), c.setVesselStatus);
router.delete("/:id", authorize("admin"), c.deleteVessel);

module.exports = router;
