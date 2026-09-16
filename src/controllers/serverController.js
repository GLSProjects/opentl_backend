const Server = require("../models/Server");

// Helper to get user's role in server
const getUserRoleInServer = (server, userId) => {
    if (!server || !userId) return null;
    const userIdStr = userId.toString();

    // Owner check
    if (server.owner && server.owner.toString() === userIdStr) {
        return "owner";
    }

    if (Array.isArray(server.members)) {
        for (const m of server.members) {
            if (!m) continue;
            // Embedded subdoc format { user, role }
            if (m.user && m.user.toString() === userIdStr) {
                return m.role || "member";
            }
            // Legacy flat ObjectId format
            if (!m.user && m.toString() === userIdStr) {
                return "member";
            }
        }
    }

    return null;
};

// @desc    Get all servers for current user
// @route   GET /api/servers
// @access  Private
const getServers = async (req, res) => {
    try {
        const servers = await Server.find({
            $or: [
                { "members.user": req.user._id },
                { members: req.user._id },
                { owner: req.user._id }
            ]
        }).populate("members.user", "username email avatar displayName");

        res.status(200).json(servers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a new server
// @route   POST /api/servers
// @access  Private
const createServer = async (req, res) => {
    try {
        const { name, icon, color, server_type, visibility } = req.body;

        if (!name) {
            return res.status(400).json({ message: "Please provide a server name" });
        }

        const finalServerType = server_type === "community" ? "community" : "friends";
        const finalVisibility = visibility
            ? (visibility === "public" ? "public" : "private")
            : (finalServerType === "community" ? "public" : "private");

        let defaultChannels = [];
        if (finalServerType === "community") {
            defaultChannels = [
                { name: "welcome", type: "text" },
                { name: "announcements", type: "text" },
                { name: "general", type: "text" },
                { name: "General Voice", type: "voice" }
            ];
        } else {
            defaultChannels = [
                { name: "general", type: "text" },
                { name: "chat", type: "text" },
                { name: "Friends Voice", type: "voice" }
            ];
        }

        const server = await Server.create({
            name,
            icon: icon || name[0].toUpperCase(),
            color: color || "bg-red-600",
            server_type: finalServerType,
            visibility: finalVisibility,
            owner: req.user._id,
            members: [
                {
                    user: req.user._id,
                    role: "owner",
                    joinedAt: new Date()
                }
            ],
            channels: defaultChannels
        });

        const populatedServer = await Server.findById(server._id).populate("members.user", "username email avatar displayName");
        res.status(201).json(populatedServer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get server details
// @route   GET /api/servers/:id
// @access  Private
const getServerDetails = async (req, res) => {
    try {
        const server = await Server.findById(req.params.id)
            .populate("members.user", "username email avatar displayName");

        if (!server) {
            return res.status(404).json({ message: "Server not found" });
        }

        const userRole = getUserRoleInServer(server, req.user._id);

        if (!userRole && server.visibility === "private") {
            return res.status(403).json({ message: "Not authorized to view this private server" });
        }

        res.status(200).json(server);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a new channel in a server
// @route   POST /api/servers/:serverId/channels
// @access  Private (owner or moderator)
const createChannel = async (req, res) => {
    try {
        const { serverId } = req.params;
        const { name, type } = req.body;

        if (!name) {
            return res.status(400).json({ message: "Please provide a channel name" });
        }

        const server = await Server.findById(serverId);
        if (!server) {
            return res.status(404).json({ message: "Server not found" });
        }

        const userRole = getUserRoleInServer(server, req.user._id);
        if (!userRole || (userRole !== "owner" && userRole !== "moderator")) {
            return res.status(403).json({ message: "Not authorized to create channels (Owner or Moderator required)" });
        }

        const newChannel = {
            name,
            type: type || "text",
        };

        server.channels.push(newChannel);
        await server.save();

        const addedChannel = server.channels[server.channels.length - 1];
        res.status(201).json(addedChannel);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Join a server
// @route   POST /api/servers/:serverId/join
// @access  Private
const joinServer = async (req, res) => {
    try {
        const { serverId } = req.params;
        const server = await Server.findById(serverId);

        if (!server) {
            return res.status(404).json({ message: "Server not found" });
        }

        // Security: Only community servers can be joined through community discovery.
        // Friends/private servers require an invite link.
        if (server.server_type !== "community") {
            return res.status(403).json({
                message: "This server is private and cannot be joined through community discovery."
            });
        }

        const existingRole = getUserRoleInServer(server, req.user._id);
        if (existingRole) {
            const populatedServer = await Server.findById(server._id).populate("members.user", "username email avatar displayName");
            return res.status(200).json({ message: "Already a member", server: populatedServer });
        }

        server.members.push({
            user: req.user._id,
            role: "member",
            joinedAt: new Date()
        });

        await server.save();
        const updatedServer = await Server.findById(server._id).populate("members.user", "username email avatar displayName");

        res.status(200).json({ message: "Successfully joined server", server: updatedServer });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Search community servers (server_type = "community" only)
// @route   GET /api/communities/search?q=...
// @access  Private
const searchCommunities = async (req, res) => {
    try {
        const q = (req.query.q || "").trim();
        const limit = Math.min(parseInt(req.query.limit) || 20, 50);

        if (!q) {
            return res.status(200).json({ communities: [] });
        }

        // Always filter by server_type = "community" at the DB level
        const filter = {
            server_type: "community",
            name: { $regex: q, $options: "i" },
        };

        const servers = await Server.find(filter)
            .select("name icon color server_type visibility members")
            .limit(limit)
            .lean();

        const communities = servers.map((s) => ({
            id: s._id,
            name: s.name,
            icon: s.icon,
            color: s.color,
            server_type: s.server_type,
            memberCount: Array.isArray(s.members) ? s.members.length : 0,
        }));

        res.status(200).json({ communities });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update server (name, icon, color, visibility, server_type)
// @route   PUT /api/servers/:serverId
// @access  Private (owner only)
const updateServer = async (req, res) => {
    try {
        const server = await Server.findById(req.params.serverId);
        if (!server) return res.status(404).json({ message: "Server not found" });

        const userRole = getUserRoleInServer(server, req.user._id);
        if (userRole !== "owner") {
            return res.status(403).json({ message: "Only the server owner can edit server settings" });
        }

        const { name, icon, color, visibility, server_type } = req.body;
        if (name) server.name = name;
        if (icon) server.icon = icon;
        if (color) server.color = color;
        if (visibility) server.visibility = visibility;
        if (server_type) server.server_type = server_type;

        await server.save();
        const updatedServer = await Server.findById(server._id).populate("members.user", "username email avatar displayName");
        res.status(200).json(updatedServer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a channel from a server
// @route   DELETE /api/servers/:serverId/channels/:channelId
// @access  Private (owner or moderator)
const deleteChannel = async (req, res) => {
    try {
        const { serverId, channelId } = req.params;
        const server = await Server.findById(serverId);
        if (!server) return res.status(404).json({ message: "Server not found" });

        const userRole = getUserRoleInServer(server, req.user._id);
        if (!userRole || (userRole !== "owner" && userRole !== "moderator")) {
            return res.status(403).json({ message: "Not authorized to delete channels (Owner or Moderator required)" });
        }

        server.channels = server.channels.filter(c => c._id.toString() !== channelId);
        await server.save();
        res.status(200).json({ deletedId: channelId });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update member role in server
// @route   PUT /api/servers/:serverId/members/:userId/role
// @access  Private (owner only)
const updateMemberRole = async (req, res) => {
    try {
        const { serverId, userId } = req.params;
        const { role } = req.body;

        if (!["moderator", "member"].includes(role)) {
            return res.status(400).json({ message: "Role must be 'moderator' or 'member'" });
        }

        const server = await Server.findById(serverId);
        if (!server) return res.status(404).json({ message: "Server not found" });

        const requesterRole = getUserRoleInServer(server, req.user._id);
        if (requesterRole !== "owner") {
            return res.status(403).json({ message: "Only the server owner can update member roles" });
        }

        if (server.owner.toString() === userId) {
            return res.status(400).json({ message: "Cannot change role of server owner" });
        }

        let found = false;
        server.members = server.members.map(m => {
            const mId = m.user ? m.user.toString() : m.toString();
            if (mId === userId) {
                found = true;
                return { user: userId, role, joinedAt: m.joinedAt || new Date() };
            }
            return m;
        });

        if (!found) {
            return res.status(404).json({ message: "Member not found in server" });
        }

        await server.save();
        const updatedServer = await Server.findById(server._id).populate("members.user", "username email avatar displayName");
        res.status(200).json(updatedServer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Kick a member from server
// @route   DELETE /api/servers/:serverId/members/:userId
// @access  Private (owner or moderator)
const kickMember = async (req, res) => {
    try {
        const { serverId, userId } = req.params;
        const server = await Server.findById(serverId);
        if (!server) return res.status(404).json({ message: "Server not found" });

        const requesterRole = getUserRoleInServer(server, req.user._id);
        if (!requesterRole || (requesterRole !== "owner" && requesterRole !== "moderator")) {
            return res.status(403).json({ message: "Not authorized to kick members" });
        }

        const targetRole = getUserRoleInServer(server, userId);
        if (!targetRole) {
            return res.status(404).json({ message: "User is not a member of this server" });
        }

        if (targetRole === "owner") {
            return res.status(403).json({ message: "Cannot kick the server owner" });
        }

        if (requesterRole === "moderator" && targetRole === "moderator") {
            return res.status(403).json({ message: "Moderators cannot kick other moderators" });
        }

        server.members = server.members.filter(m => {
            const mId = m.user ? m.user.toString() : m.toString();
            return mId !== userId;
        });

        await server.save();
        const updatedServer = await Server.findById(server._id).populate("members.user", "username email avatar displayName");
        res.status(200).json({ message: "Member removed", server: updatedServer });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Leave a server
// @route   POST /api/servers/:serverId/leave
// @access  Private
const leaveServer = async (req, res) => {
    try {
        const { serverId } = req.params;
        const server = await Server.findById(serverId);
        if (!server) return res.status(404).json({ message: "Server not found" });

        const userIdStr = req.user._id.toString();

        if (server.owner && server.owner.toString() === userIdStr) {
            return res.status(400).json({ message: "Transfer ownership before leaving the server." });
        }

        const isMember = server.members.some(m => {
            const mId = m.user ? m.user.toString() : m.toString();
            return mId === userIdStr;
        });

        if (!isMember) {
            return res.status(400).json({ message: "You are not a member of this server." });
        }

        server.members = server.members.filter(m => {
            const mId = m.user ? m.user.toString() : m.toString();
            return mId !== userIdStr;
        });

        await server.save();
        res.status(200).json({ message: "Successfully left the server", serverId });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a server
// @route   DELETE /api/servers/:serverId
// @access  Private (owner only)
const deleteServer = async (req, res) => {
    try {
        const { serverId } = req.params;
        const server = await Server.findById(serverId);
        if (!server) return res.status(404).json({ message: "Server not found" });

        const userRole = getUserRoleInServer(server, req.user._id);
        if (userRole !== "owner") {
            return res.status(403).json({ message: "Only the server owner can delete the server" });
        }

        await Server.findByIdAndDelete(serverId);
        res.status(200).json({ message: "Server deleted successfully", serverId });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
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
    searchCommunities,
    getUserRoleInServer,
};
