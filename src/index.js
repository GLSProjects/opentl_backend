require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const authRoutes = require("./routes/authRoutes");
const serverRoutes = require("./routes/serverRoutes");
const messageRoutes = require("./routes/messageRoutes");
const chatbotRoutes = require("./routes/chatbotRoutes");
const meetingRoutes = require("./routes/meetingRoutes");
const inviteRoutes = require("./routes/inviteRoutes");
const communityRoutes = require("./routes/communityRoutes");

const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "https://opentlclient.vercel.app",
];

const isOriginAllowed = (origin) => {
    if (!origin) return true;
    if (ALLOWED_ORIGINS.includes(origin)) return true;
    if (origin.includes("localhost") || origin.includes("127.0.0.1") || origin.includes("192.168.") || origin.includes("10.")) return true;
    return false;
};
const io = new Server(server, {
    cors: {
        origin: (origin, callback) => {
            // Allow requests with no origin (e.g., mobile apps, curl)
            if (!origin) return callback(null, true);
            if (isOriginAllowed(origin)) {
                return callback(null, true);
            }
            console.warn("⚠️ Blocked CORS origin:", origin);
            return callback(new Error("Not allowed by CORS"));
        },
        methods: ["GET", "POST"],
        credentials: true,
    },
    transports: ["websocket", "polling"],
    pingTimeout: 60000,
    pingInterval: 25000,
});

// Voice Presence & Signaling
const voiceUsers = {}; // { roomId: [ { socketId, userId, username, avatar } ] }
const meetingRooms = {}; // { roomId: [{ socketId, userId, userName, avatar }] }
const channelUsers = {}; // { channelId: [ { socketId, userId, username, avatar, isTyping } ] }
const typingUsers = {}; // { channelId: { userId: timeout } }
const globalUsers = new Set(); // Track all connected users by socketId


app.get("/", (req, res) => {
  res.status(200).json({
    message: "🚀 Backend is running successfully",
    status: "OK"
  });
});

io.on("connection", (socket) => {
    console.log("✅ Socket connected:", socket.id, "| transport:", socket.conn.transport.name);
    
    // Log transport upgrades (polling → websocket)
    socket.conn.on("upgrade", (transport) => {
        console.log("⬆️  Transport upgraded to:", transport.name, "for", socket.id);
    });

    // Add to global users
    globalUsers.add(socket.id);
    
    // Broadcast updated user count
    io.emit("user-count-updated", globalUsers.size);

    // --- TEXT CHAT EVENTS ---
    socket.on("join-channel", (data) => {
        const { channelId, user } = data;
        socket.join(channelId);
        console.log(`Socket ${socket.id} joined channel ${channelId}`);

        // Track user in channel
        if (!channelUsers[channelId]) {
            channelUsers[channelId] = [];
        }
        
        // Remove user if already exists
        channelUsers[channelId] = channelUsers[channelId].filter(u => u.socketId !== socket.id);
        
        // Add user to channel
        channelUsers[channelId].push({
            socketId: socket.id,
            userId: user._id,
            username: user.username,
            avatar: user.avatar,
            isTyping: false
        });

        // Notify channel about user list
        io.to(channelId).emit("channel-users-updated", channelUsers[channelId]);
    });

    socket.on("leave-channel", (data) => {
        const { channelId } = data;
        socket.leave(channelId);
        console.log(`Socket ${socket.id} left channel ${channelId}`);

        // Remove user from channel
        if (channelUsers[channelId]) {
            channelUsers[channelId] = channelUsers[channelId].filter(u => u.socketId !== socket.id);
            io.to(channelId).emit("channel-users-updated", channelUsers[channelId]);
        }
    });

    socket.on("send-message", (message) => {
        // Broadcast to everyone in the channel (including sender)
        io.to(message.channelId).emit("new-message", message);
    });

    socket.on("delete-message", (data) => {
        const { messageId, channelId } = data;
        // Broadcast deletion event
        socket.to(channelId).emit("message-deleted", messageId);
    });

    socket.on("typing-start", (data) => {
        const { channelId, userId } = data;
        
        // Clear existing timeout
        if (typingUsers[channelId] && typingUsers[channelId][userId]) {
            clearTimeout(typingUsers[channelId][userId]);
        }
        
        // Set new timeout
        if (!typingUsers[channelId]) {
            typingUsers[channelId] = {};
        }
        
        typingUsers[channelId][userId] = setTimeout(() => {
            socket.to(channelId).emit("typing-stop", { userId });
            delete typingUsers[channelId][userId];
        }, 3000);
        
        // Update user typing status
        if (channelUsers[channelId]) {
            const user = channelUsers[channelId].find(u => u.userId === userId);
            if (user) {
                user.isTyping = true;
                io.to(channelId).emit("channel-users-updated", channelUsers[channelId]);
            }
        }
        
        socket.to(channelId).emit("typing-start", { userId });
    });

    socket.on("typing-stop", (data) => {
        const { channelId, userId } = data;
        
        // Clear timeout
        if (typingUsers[channelId] && typingUsers[channelId][userId]) {
            clearTimeout(typingUsers[channelId][userId]);
            delete typingUsers[channelId][userId];
        }
        
        // Update user typing status
        if (channelUsers[channelId]) {
            const user = channelUsers[channelId].find(u => u.userId === userId);
            if (user) {
                user.isTyping = false;
                io.to(channelId).emit("channel-users-updated", channelUsers[channelId]);
            }
        }
        
        socket.to(channelId).emit("typing-stop", { userId });
    });

    // --- VOICE CHAT EVENTS ---
    socket.on("join-voice", (data) => {
        const { roomId, user } = data;
        socket.join(roomId);
        console.log(`Socket ${socket.id} joined voice room ${roomId}`);

        // Track user in voice room
        if (!voiceUsers[roomId]) {
            voiceUsers[roomId] = [];
        }
        
        // Remove user if already exists
        voiceUsers[roomId] = voiceUsers[roomId].filter(u => u.socketId !== socket.id);
        
        // Add user to voice room
        voiceUsers[roomId].push({
            socketId: socket.id,
            userId: user._id,
            username: user.username,
            avatar: user.avatar
        });

        // Notify room about user list
        io.to(roomId).emit("voice-users-updated", voiceUsers[roomId]);
        
        // Notify others in room
        socket.to(roomId).emit("user-joined-voice", {
            userId: user._id,
            username: user.username,
            avatar: user.avatar
        });
    });

    socket.on("leave-voice", (data) => {
        const { roomId, userId } = data;
        socket.leave(roomId);
        console.log(`Socket ${socket.id} left voice room ${roomId}`);

        // Remove user from voice room
        if (voiceUsers[roomId]) {
            voiceUsers[roomId] = voiceUsers[roomId].filter(u => u.socketId !== socket.id);
            io.to(roomId).emit("voice-users-updated", voiceUsers[roomId]);
            
            // Notify others in room
            socket.to(roomId).emit("user-left-voice", { userId });
        }
    });

    // WebRTC Signaling
    socket.on("voice-offer", (data) => {
        const { targetUserId, offer, roomId } = data;
        socket.to(roomId).emit("voice-offer", {
            fromUserId: data.userId,
            offer
        });
    });

    socket.on("voice-answer", (data) => {
        const { targetUserId, answer, roomId } = data;
        socket.to(roomId).emit("voice-answer", {
            fromUserId: data.userId,
            answer
        });
    });

    socket.on("voice-ice-candidate", (data) => {
        const { targetUserId, candidate, roomId } = data;
        socket.to(roomId).emit("voice-ice-candidate", {
            fromUserId: data.userId,
            candidate
        });
    });

    // --- MEETING ROOM EVENTS ---
    socket.on("meeting-join", (data) => {
        const { roomId, userId, userName, avatar } = data;
        socket.join(`meeting-${roomId}`);
        if (!meetingRooms[roomId]) meetingRooms[roomId] = [];
        meetingRooms[roomId] = meetingRooms[roomId].filter(u => u.socketId !== socket.id);
        meetingRooms[roomId].push({ socketId: socket.id, userId, userName, avatar });
        socket.emit("meeting-existing-users", meetingRooms[roomId].filter(u => u.socketId !== socket.id));
        socket.to(`meeting-${roomId}`).emit("meeting-user-joined", { socketId: socket.id, userId, userName, avatar });
        console.log(`Meeting join: ${userName} -> room ${roomId}`);
    });

    socket.on("meeting-offer", (data) => {
        const { targetSocketId, offer, fromSocketId, userName } = data;
        io.to(targetSocketId).emit("meeting-offer", { offer, fromSocketId, userName });
    });

    socket.on("meeting-answer", (data) => {
        const { targetSocketId, answer, fromSocketId } = data;
        io.to(targetSocketId).emit("meeting-answer", { answer, fromSocketId });
    });

    socket.on("meeting-ice-candidate", (data) => {
        const { targetSocketId, candidate, fromSocketId } = data;
        io.to(targetSocketId).emit("meeting-ice-candidate", { candidate, fromSocketId });
    });

    socket.on("meeting-leave", (data) => {
        const { roomId } = data;
        socket.leave(`meeting-${roomId}`);
        if (meetingRooms[roomId]) {
            meetingRooms[roomId] = meetingRooms[roomId].filter(u => u.socketId !== socket.id);
            socket.to(`meeting-${roomId}`).emit("meeting-user-left", { socketId: socket.id });
        }
    });

    socket.on("meeting-media-state", (data) => {
        const { roomId, isMuted, isVideoOff } = data;
        socket.to(`meeting-${roomId}`).emit("meeting-media-state", { socketId: socket.id, isMuted, isVideoOff });
    });

    socket.on("disconnect", () => {
        console.log("Disconnected:", socket.id);
        
        // Remove from global users
        globalUsers.delete(socket.id);
        
        // Broadcast updated user count
        io.emit("user-count-updated", globalUsers.size);
        
        // Clean up from all channels
        Object.keys(channelUsers).forEach(channelId => {
            channelUsers[channelId] = channelUsers[channelId].filter(u => u.socketId !== socket.id);
            if (channelUsers[channelId].length > 0) {
                io.to(channelId).emit("channel-users-updated", channelUsers[channelId]);
            }
        });
        
        // Clean up from all voice rooms
        Object.keys(voiceUsers).forEach(roomId => {
            const userIndex = voiceUsers[roomId].findIndex(u => u.socketId === socket.id);
            if (userIndex !== -1) {
                const user = voiceUsers[roomId][userIndex];
                voiceUsers[roomId].splice(userIndex, 1);
                if (voiceUsers[roomId].length > 0) {
                    io.to(roomId).emit("voice-users-updated", voiceUsers[roomId]);
                    io.to(roomId).emit("user-left-voice", { userId: user.userId });
                }
            }
        });

        // Clean up meeting rooms
        Object.keys(meetingRooms).forEach(roomId => {
            const idx = meetingRooms[roomId].findIndex(u => u.socketId === socket.id);
            if (idx !== -1) {
                meetingRooms[roomId].splice(idx, 1);
                io.to(`meeting-${roomId}`).emit("meeting-user-left", { socketId: socket.id });
            }
        });
    });
});

// Middleware (Increased limits for base64 avatars and CORS preflight handle)
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (isOriginAllowed(origin)) return callback(null, true);
        return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(morgan("dev"));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/servers", serverRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/meetings", meetingRoutes);
app.use("/api/invite", inviteRoutes);
app.use("/api/communities", communityRoutes);

// Get active user count
app.get("/api/users/active", (req, res) => {
    res.json({ 
        activeUsers: globalUsers.size,
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: "Something went wrong!" });
});

const { runDatabaseMigration } = require("./utils/migration");

// Connect to MongoDB with better connection options
mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000, // Keep trying to send operations for 30 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
})
.then(async () => {
    console.log("✅ Successfully connected to MongoDB");
    await runDatabaseMigration();
})
.catch((err) => {
    console.error("❌ Critical Error: Could not connect to MongoDB.");
    console.error("Error Message:", err.message);
    console.error("--- ACTION REQUIRED ---");
    console.error("Please ensure your IP is whitelisted in MongoDB Atlas:");
    console.error("https://www.mongodb.com/docs/atlas/security-whitelist/");
    console.error("------------------------");
    process.exit(1);
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`🔗 API Endpoint: http://127.0.0.1:${PORT}/api/auth`);
});
