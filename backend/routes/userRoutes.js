const express = require("express");
const router = express.Router();
const { getUsers, createUser, setUserStatus, setApproval, deleteUser } = require("../controllers/userController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.use(protect, authorize("admin")); // every route here is admin-only

router.get("/", getUsers);
router.post("/", createUser);
router.patch("/:id/status", setUserStatus);
router.patch("/:id/approval", setApproval);
router.delete("/:id", deleteUser);

module.exports = router;
