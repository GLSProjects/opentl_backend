const express = require("express");
const router = express.Router();
const {
  createInvite,
  getInvite,
  joinByInvite,
  getServerInvites,
  revokeInvite,
} = require("../controllers/inviteController");

const { protect } = require("../middleware/authMiddleware");

// Get active invites for a server
router.get("/server/:serverId", protect, getServerInvites);

// Create invite
router.post("/:serverId", protect, createInvite);

// Revoke invite
router.delete("/:serverId/:code", protect, revokeInvite);

// Get invite info (for preview / validation)
router.get("/:code", protect, getInvite);

// Join server via invite
router.post("/join/:code", protect, joinByInvite);

module.exports = router;
