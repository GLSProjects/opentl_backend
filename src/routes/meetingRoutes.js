// Meeting Room Management API Routes
const express = require('express');
const router = express.Router();

// In-memory storage for demo (in production, use Redis or database)
const activeRooms = new Map();
const roomParticipants = new Map();
const userSessions = new Map();

// @desc    Create a new meeting room
// @route   POST /api/meetings/create
// @access  Public
router.post('/create', (req, res) => {
  try {
    const { roomName, hostName, isPrivate = false, maxParticipants = 10 } = req.body;

    if (!roomName || !hostName) {
      return res.status(400).json({ error: 'Room name and host name are required' });
    }

    const roomId = generateRoomId();
    const room = {
      id: roomId,
      name: roomName,
      host: hostName,
      participants: [],
      maxParticipants,
      isPrivate,
      createdAt: new Date(),
      isActive: true,
      settings: {
        allowScreenShare: true,
        allowChat: true,
        requirePassword: isPrivate,
        recordingEnabled: false
      }
    };

    activeRooms.set(roomId, room);
    roomParticipants.set(roomId, new Map());

    res.json({
      success: true,
      room: {
        id: roomId,
        name: roomName,
        host: hostName,
        participantCount: 0,
        maxParticipants
      }
    });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Failed to create meeting room' });
  }
});

// @desc    Join a meeting room
// @route   POST /api/meetings/:roomId/join
// @access  Public
router.post('/:roomId/join', (req, res) => {
  try {
    const { roomId } = req.params;
    const { userName, userAvatar, isAudioOnly = false } = req.body;

    if (!userName) {
      return res.status(400).json({ error: 'User name is required' });
    }

    const room = activeRooms.get(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Meeting room not found' });
    }

    if (room.participants.length >= room.maxParticipants) {
      return res.status(403).json({ error: 'Meeting room is full' });
    }

    const userId = generateUserId();
    const participant = {
      id: userId,
      name: userName,
      avatar: userAvatar || userName.charAt(0).toUpperCase(),
      joinedAt: new Date(),
      isAudioOnly,
      isMuted: false,
      isVideoOff: false,
      hasScreenShare: false,
      role: room.participants.length === 0 ? 'host' : 'participant'
    };

    room.participants.push(participant);
    roomParticipants.get(roomId).set(userId, participant);

    // Update room activity
    room.lastActivity = new Date();

    res.json({
      success: true,
      participant: {
        id: userId,
        name: userName,
        avatar: userAvatar || userName.charAt(0).toUpperCase(),
        role: participant.role,
        participantCount: room.participants.length
      },
      room: {
        id: room.id,
        name: room.name,
        host: room.host,
        participantCount: room.participants.length,
        maxParticipants: room.maxParticipants,
        settings: room.settings
      }
    });
  } catch (error) {
    console.error('Error joining room:', error);
    res.status(500).json({ error: 'Failed to join meeting room' });
  }
});

// @desc    Leave a meeting room
// @route   POST /api/meetings/:roomId/leave
// @access  Public
router.post('/:roomId/leave', (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;

    const room = activeRooms.get(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Meeting room not found' });
    }

    const participants = roomParticipants.get(roomId);
    if (participants) {
      participants.delete(userId);
      
      // Remove from room participants array
      room.participants = room.participants.filter(p => p.id !== userId);
      
      // If room is empty, deactivate it
      if (room.participants.length === 0) {
        room.isActive = false;
      }
    }

    res.json({
      success: true,
      message: 'Left meeting room successfully'
    });
  } catch (error) {
    console.error('Error leaving room:', error);
    res.status(500).json({ error: 'Failed to leave meeting room' });
  }
});

// @desc    Get meeting room info
// @route   GET /api/meetings/:roomId
// @access  Public
router.get('/:roomId', (req, res) => {
  try {
    const { roomId } = req.params;
    const room = activeRooms.get(roomId);

    if (!room) {
      return res.status(404).json({ error: 'Meeting room not found' });
    }

    res.json({
      success: true,
      room: {
        id: room.id,
        name: room.name,
        host: room.host,
        participantCount: room.participants.length,
        maxParticipants: room.maxParticipants,
        isActive: room.isActive,
        createdAt: room.createdAt,
        settings: room.settings
      }
    });
  } catch (error) {
    console.error('Error getting room info:', error);
    res.status(500).json({ error: 'Failed to get room info' });
  }
});

// @desc    Get all active meeting rooms
// @route   GET /api/meetings
// @access  Public
router.get('/', (req, res) => {
  try {
    const rooms = Array.from(activeRooms.values()).map(room => ({
      id: room.id,
      name: room.name,
      host: room.host,
      participantCount: room.participants.length,
      maxParticipants: room.maxParticipants,
      isActive: room.isActive,
      createdAt: room.createdAt,
      isPrivate: room.isPrivate
    }));

    res.json({
      success: true,
      rooms: rooms.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    });
  } catch (error) {
    console.error('Error getting rooms:', error);
    res.status(500).json({ error: 'Failed to get meeting rooms' });
  }
});

// @desc    Update participant status (mute, video off, screen share)
// @route   PUT /api/meetings/:roomId/participants/:userId/status
// @access  Public
router.put('/:roomId/participants/:userId/status', (req, res) => {
  try {
    const { roomId, userId } = req.params;
    const { isMuted, isVideoOff, hasScreenShare } = req.body;

    const participants = roomParticipants.get(roomId);
    if (!participants) {
      return res.status(404).json({ error: 'Meeting room not found' });
    }

    const participant = participants.get(userId);
    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    // Update participant status
    if (isMuted !== undefined) participant.isMuted = isMuted;
    if (isVideoOff !== undefined) participant.isVideoOff = isVideoOff;
    if (hasScreenShare !== undefined) participant.hasScreenShare = hasScreenShare;

    res.json({
      success: true,
      participant: {
        id: participant.id,
        isMuted: participant.isMuted,
        isVideoOff: participant.isVideoOff,
        hasScreenShare: participant.hasScreenShare
      }
    });
  } catch (error) {
    console.error('Error updating participant status:', error);
    res.status(500).json({ error: 'Failed to update participant status' });
  }
});

// @desc    Get meeting participants
// @route   GET /api/meetings/:roomId/participants
// @access  Public
router.get('/:roomId/participants', (req, res) => {
  try {
    const { roomId } = req.params;
    const room = activeRooms.get(roomId);

    if (!room) {
      return res.status(404).json({ error: 'Meeting room not found' });
    }

    const participants = Array.from(roomParticipants.get(roomId).values()).map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      role: p.role,
      joinedAt: p.joinedAt,
      isMuted: p.isMuted,
      isVideoOff: p.isVideoOff,
      hasScreenShare: p.hasScreenShare,
      isAudioOnly: p.isAudioOnly
    }));

    res.json({
      success: true,
      participants
    });
  } catch (error) {
    console.error('Error getting participants:', error);
    res.status(500).json({ error: 'Failed to get participants' });
  }
});

// @desc    Delete a meeting room (host only)
// @route   DELETE /api/meetings/:roomId
// @access  Public
router.delete('/:roomId', (req, res) => {
  try {
    const { roomId } = req.params;
    const { hostId } = req.body;

    const room = activeRooms.get(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Meeting room not found' });
    }

    // Find host participant
    const participants = roomParticipants.get(roomId);
    const hostParticipant = Array.from(participants.values()).find(p => p.role === 'host');

    if (!hostParticipant || hostParticipant.id !== hostId) {
      return res.status(403).json({ error: 'Only host can delete the meeting room' });
    }

    // Remove room
    activeRooms.delete(roomId);
    roomParticipants.delete(roomId);

    res.json({
      success: true,
      message: 'Meeting room deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({ error: 'Failed to delete meeting room' });
  }
});

// Helper functions
function generateRoomId() {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

function generateUserId() {
  return Math.random().toString(36).substring(2, 15);
}

module.exports = router;
