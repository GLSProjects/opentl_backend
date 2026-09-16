const mongoose = require("mongoose");

const channelSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    type: {
        type: String,
        enum: ["text", "voice"],
        default: "text",
    }
});

const memberSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    role: {
        type: String,
        enum: ["owner", "moderator", "member"],
        default: "member",
    },
    joinedAt: {
        type: Date,
        default: Date.now,
    },
}, { _id: false });

const serverSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Please provide a server name"],
            trim: true,
        },
        icon: {
            type: String,
            required: true,
        },
        color: {
            type: String,
            default: "bg-red-600",
        },
        server_type: {
            type: String,
            enum: ["community", "friends"],
            default: "friends",
        },
        visibility: {
            type: String,
            enum: ["public", "private"],
            default: "private",
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        members: [memberSchema],
        channels: [channelSchema],
    },
    { timestamps: true }
);

module.exports = mongoose.model("Server", serverSchema);
