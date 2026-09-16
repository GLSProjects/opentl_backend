const Server = require("../models/Server");

function extractUserId(item) {
    if (!item) return null;
    if (typeof item === "string") {
        if (item.length === 24 && /^[0-9a-fA-F]{24}$/.test(item)) return item;
        const match = item.match(/Buffer ([0-9a-fA-F ]+)/);
        if (match) {
            const hex = match[1].replace(/\s+/g, "");
            if (hex.length === 24) return hex;
        }
        return null;
    }
    if (item._id) return extractUserId(item._id);
    if (item.user) return extractUserId(item.user);
    if (item.buffer && Buffer.isBuffer(item.buffer)) return item.buffer.toString("hex");
    if (typeof item.toString === "function") {
        const str = item.toString();
        if (str.length === 24 && /^[0-9a-fA-F]{24}$/.test(str)) return str;
    }
    return null;
}

/**
 * Migration helper to ensure existing MongoDB server documents match the new schema:
 * - server_type ("community" vs "friends")
 * - visibility ("public" vs "private")
 * - members array structure [{ user, role, joinedAt }]
 */
const runDatabaseMigration = async () => {
    try {
        const servers = await Server.find({});
        console.log(`🔍 Checking ${servers.length} existing server(s) for database migration...`);

        let migratedCount = 0;

        for (const server of servers) {
            let updated = false;

            // 1. Ensure server_type
            if (!server.server_type) {
                server.server_type = (server.channels && server.channels.length > 2) ? "community" : "friends";
                updated = true;
            }

            // 2. Ensure visibility
            if (!server.visibility) {
                server.visibility = server.server_type === "friends" ? "private" : "public";
                updated = true;
            }

            // 3. Normalize members array safely
            const normalizedMembers = [];
            const rawMembers = server.members || [];
            let ownerInMembers = false;

            for (const m of rawMembers) {
                if (!m) continue;
                const userId = extractUserId(m);
                if (!userId) continue;

                let role = (typeof m === "object" && m.role) ? m.role : "member";
                let joinedAt = (typeof m === "object" && m.joinedAt) ? m.joinedAt : new Date();

                // If this user is owner, ensure role is owner
                if (server.owner && userId === server.owner.toString()) {
                    role = "owner";
                    ownerInMembers = true;
                }

                // Avoid duplicates
                if (!normalizedMembers.some(nm => nm.user.toString() === userId)) {
                    normalizedMembers.push({
                        user: userId,
                        role,
                        joinedAt,
                    });
                }
            }

            // If owner was not in members list, add owner
            if (server.owner && !ownerInMembers) {
                const ownerIdStr = server.owner.toString();
                if (!normalizedMembers.some(nm => nm.user.toString() === ownerIdStr)) {
                    normalizedMembers.unshift({
                        user: ownerIdStr,
                        role: "owner",
                        joinedAt: server.createdAt || new Date(),
                    });
                }
                updated = true;
            }

            server.members = normalizedMembers;
            await server.save();
            migratedCount++;
        }

        console.log(`✅ DB Migration complete. ${migratedCount} server(s) verified/updated.`);
    } catch (error) {
        console.error("⚠️ Migration warning:", error.message);
    }
};

module.exports = { runDatabaseMigration };
