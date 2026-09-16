const mongoose = require("mongoose");

const inviteSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
  },
  serverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Server",
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  expiresAt: {
    type: Date,
    default: null,
  },
  maxUses: {
    type: Number,
    default: 0, // 0 = unlimited
  },
  uses: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Invite", inviteSchema);
