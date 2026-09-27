const express = require("express");
const router = express.Router();
const c = require("../controllers/paymentController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/", c.getPayments);
router.post("/fine/:fineId", c.payFine);
router.get("/:id", c.getPaymentById);

module.exports = router;
