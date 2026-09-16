const express = require("express");
const router = express.Router();
const { getMessages, createMessage, deleteMessage } = require("../controllers/messageController");
const { protect } = require("../middleware/authMiddleware");

router.route("/").post(protect, createMessage);
router.route("/:channelId").get(protect, getMessages);
router.route("/:messageId").delete(protect, deleteMessage);

module.exports = router;
