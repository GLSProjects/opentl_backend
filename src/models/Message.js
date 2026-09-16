const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
    {
        content: {
            type: String,
            required: [true, "Message content is required"],
            trim: true,
        },
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        serverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Server",
            required: true,
        },
        channelId: {
            type: String, // Storing channel ID as string since it's an subdocument ID
            required: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);
