const crypto = require("crypto");

const activeRooms = new Map();
const roomParticipants = new Map();

function generateHostToken() {
    return crypto.randomBytes(16).toString("hex");
}

module.exports = {
    activeRooms,
    roomParticipants,
    generateHostToken
};

