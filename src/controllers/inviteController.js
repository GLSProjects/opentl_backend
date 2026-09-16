const Invite = require("../models/Invite");
const Server = require("../models/Server");
const { nanoid } = require("nanoid");
const { getUserRoleInServer } = require("./serverController");

// Create Invite Link
const createInvite = async (req, res) => {
  try {
    const { serverId } = req.params;
    const { maxUses, expiresAtHours } = req.body;

    const server = await Server.findById(serverId);
    if (!server) {
      return res.status(404).json({ message: "Server not found" });
    }

    const userRole = getUserRoleInServer(server, req.user._id);
    if (!userRole) {
      return res.status(403).json({ message: "Not authorized to create invites for this server" });
    }

    const code = nanoid(6);
    let expiresAt = null;

    if (expiresAtHours && Number(expiresAtHours) > 0) {
      expiresAt = new Date(Date.now() + Number(expiresAtHours) * 60 * 60 * 1000);
    }

    const invite = await Invite.create({
      code,
      serverId,
      createdBy: req.user._id,
      maxUses: maxUses ? Number(maxUses) : 0,
      expiresAt,
    });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    res.status(201).json({
      code,
      link: `${frontendUrl}/invite/${code}`,
      maxUses: invite.maxUses,
      expiresAt: invite.expiresAt,
      uses: invite.uses,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Invite Details & Validation
const getInvite = async (req, res) => {
  try {
    const invite = await Invite.findOne({ code: req.params.code })
      .populate("serverId", "name icon color server_type visibility members owner")
      .populate("createdBy", "username displayName avatar");

    if (!invite) {
      return res.status(404).json({ message: "Invite is invalid or has expired." });
    }

    // Check expiration
    if (invite.expiresAt && new Date() > new Date(invite.expiresAt)) {
      return res.status(400).json({ message: "Invite is invalid or has expired." });
    }

    // Check max uses
    if (invite.maxUses > 0 && invite.uses >= invite.maxUses) {
      return res.status(400).json({ message: "Invite is invalid or has expired." });
    }

    const server = invite.serverId;
    if (!server) {
      return res.status(404).json({ message: "Server not found" });
    }

    res.json({
      code: invite.code,
      serverId: server._id,
      server: {
        _id: server._id,
        name: server.name,
        icon: server.icon,
        color: server.color,
        server_type: server.server_type,
        visibility: server.visibility,
        memberCount: server.members.length,
      },
      createdBy: invite.createdBy,
      expiresAt: invite.expiresAt,
      maxUses: invite.maxUses,
      uses: invite.uses,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Join via Invite
const joinByInvite = async (req, res) => {
  try {
    const invite = await Invite.findOne({ code: req.params.code });

    if (!invite) {
      return res.status(404).json({ message: "Invite is invalid or has expired." });
    }

    // Check expiration
    if (invite.expiresAt && new Date() > new Date(invite.expiresAt)) {
      return res.status(400).json({ message: "Invite is invalid or has expired." });
    }

    // Check max uses
    if (invite.maxUses > 0 && invite.uses >= invite.maxUses) {
      return res.status(400).json({ message: "Invite is invalid or has expired." });
    }

    const server = await Server.findById(invite.serverId);
    if (!server) {
      return res.status(404).json({ message: "Server not found" });
    }

    const existingRole = getUserRoleInServer(server, req.user._id);

    if (existingRole) {
      const populatedServer = await Server.findById(server._id).populate("members.user", "username email avatar displayName");
      return res.json({ message: "Already joined", server: populatedServer });
    }

    server.members.push({
      user: req.user._id,
      role: "member",
      joinedAt: new Date()
    });

    await server.save();

    // Increment invite usage
    invite.uses += 1;
    await invite.save();

    const populatedServer = await Server.findById(server._id).populate("members.user", "username email avatar displayName");

    res.json({ message: "Joined successfully", server: populatedServer });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all invites for a server (for server settings)
const getServerInvites = async (req, res) => {
  try {
    const { serverId } = req.params;
    const server = await Server.findById(serverId);
    if (!server) return res.status(404).json({ message: "Server not found" });

    const userRole = getUserRoleInServer(server, req.user._id);
    if (!userRole) {
      return res.status(403).json({ message: "Not authorized to view server invites" });
    }

    const invites = await Invite.find({ serverId })
      .populate("createdBy", "username displayName avatar")
      .sort({ createdAt: -1 });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const formattedInvites = invites.map(inv => ({
      _id: inv._id,
      code: inv.code,
      link: `${frontendUrl}/invite/${inv.code}`,
      createdBy: inv.createdBy,
      maxUses: inv.maxUses,
      uses: inv.uses,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
    }));

    res.json(formattedInvites);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Revoke invite
const revokeInvite = async (req, res) => {
  try {
    const { serverId, code } = req.params;
    const server = await Server.findById(serverId);
    if (!server) return res.status(404).json({ message: "Server not found" });

    const userRole = getUserRoleInServer(server, req.user._id);
    if (!userRole || (userRole !== "owner" && userRole !== "moderator")) {
      return res.status(403).json({ message: "Not authorized to revoke invites (Owner or Moderator required)" });
    }

    await Invite.findOneAndDelete({ serverId, code });
    res.json({ message: "Invite revoked successfully", code });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createInvite,
  getInvite,
  joinByInvite,
  getServerInvites,
  revokeInvite,
};
