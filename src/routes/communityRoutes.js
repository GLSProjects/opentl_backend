const express = require("express");
const router = express.Router();
const { searchCommunities } = require("../controllers/serverController");
const { protect } = require("../middleware/authMiddleware");

// GET /api/communities/search?q=<query>
// Only returns servers with server_type = "community"
router.get("/search", protect, searchCommunities);

module.exports = router;
