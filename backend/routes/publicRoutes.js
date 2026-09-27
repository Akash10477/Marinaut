const express = require("express");
const router = express.Router();
const { lookupFines, verifyReceipt, getStats } = require("../controllers/publicController");

router.get("/fines/:registrationNumber", lookupFines);
router.get("/verify/:transactionId", verifyReceipt);
router.get("/stats", getStats);

module.exports = router;
