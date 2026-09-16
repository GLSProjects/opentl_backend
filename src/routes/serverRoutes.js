const express = require("express");
const router = express.Router();
const {
    getServers,
    createServer,
    getServerDetails,
    createChannel,
    joinServer,
    leaveServer,
    updateServer,
    deleteChannel,
    updateMemberRole,
    kickMember,
    deleteServer,
} = require("../controllers/serverController");
const { protect } = require("../middleware/authMiddleware");

router.route("/").get(protect, getServers).post(protect, createServer);
router.route("/:id").get(protect, getServerDetails);
router.route("/:serverId").put(protect, updateServer).delete(protect, deleteServer);
router.route("/:serverId/channels").post(protect, createChannel);
router.route("/:serverId/channels/:channelId").delete(protect, deleteChannel);
router.route("/:serverId/join").post(protect, joinServer);
router.route("/:serverId/leave").post(protect, leaveServer);
router.route("/:serverId/members/:userId/role").put(protect, updateMemberRole);
router.route("/:serverId/members/:userId").delete(protect, kickMember);

module.exports = router;
