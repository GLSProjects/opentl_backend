const express = require('express');
const router = express.Router();
const { activeRooms, roomParticipants, generateHostToken } = require('../utils/meetingStore');
const { protect } = require('../middleware/authMiddleware');

router.post('/create', protect, (req, res) => {
  try {
    const { roomName, isPrivate = false, maxParticipants = 10 } = req.body;

    if (!roomName) {
      return res.status(400).json({ error: 'Room name is required' });
    }

    const hostName = req.user.displayName || req.user.username;
    const hostUserId = req.user._id.toString();
    const roomId = generateRoomId();
    const hostToken = generateHostToken();

    const room = {
      id: roomId,
      name: roomName,
      host: hostName,
      hostUserId,
      hostToken,
      hostSocketId: null,
      participants: [],
      maxParticipants,
      isPrivate,
      createdAt: new Date(),
      isActive: true,
      ended: false,
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
        hostUserId,
        hostToken,
        participantCount: 0,
        maxParticipants
      }
    });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Failed to create meeting room' });
  }
});

router.post('/:roomId/join', protect, (req, res) => {
  try {
    const { roomId } = req.params;
    const { isAudioOnly = false } = req.body;

    const room = activeRooms.get(roomId);
    if (!room || room.ended) {
      return res.status(404).json({ error: 'Meeting room not found or ended' });
    }

    if (room.participants.length >= room.maxParticipants) {
      return res.status(403).json({ error: 'Meeting room is full' });
    }

    const userId = req.user._id.toString();
    const userName = req.user.displayName || req.user.username;
    const userAvatar = req.user.avatar || userName.charAt(0).toUpperCase();

    const participant = {
      id: userId,
      name: userName,
      avatar: userAvatar,
      joinedAt: new Date(),
      isAudioOnly,
      isMuted: false,
      isVideoOff: false,
      hasScreenShare: false,
      role: room.hostUserId === userId ? 'host' : 'participant'
    };

    room.participants.push(participant);
    if (!roomParticipants.has(roomId)) {
      roomParticipants.set(roomId, new Map());
    }
    roomParticipants.get(roomId).set(userId, participant);
    room.lastActivity = new Date();

    res.json({
      success: true,
      participant: {
        id: userId,
        name: userName,
        avatar: userAvatar,
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

router.post('/:roomId/leave', protect, (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id.toString();

    const room = activeRooms.get(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Meeting room not found' });
    }

    const participants = roomParticipants.get(roomId);
    if (participants) {
      participants.delete(userId);
      room.participants = room.participants.filter(p => p.id !== userId);
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

router.get('/:roomId', protect, (req, res) => {
  try {
    const { roomId } = req.params;
    const room = activeRooms.get(roomId);

    if (!room || room.ended) {
      return res.status(404).json({ error: 'Meeting room not found or ended' });
    }

    res.json({
      success: true,
      room: {
        id: room.id,
        name: room.name,
        host: room.host,
        hostUserId: room.hostUserId,
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

router.get('/', protect, (req, res) => {
  try {
    const rooms = Array.from(activeRooms.values())
      .filter(room => !room.ended && room.isActive)
      .map(room => ({
        id: room.id,
        name: room.name,
        host: room.host,
        hostUserId: room.hostUserId,
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

router.put('/:roomId/participants/:userId/status', protect, (req, res) => {
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

router.get('/:roomId/participants', protect, (req, res) => {
  try {
    const { roomId } = req.params;
    const room = activeRooms.get(roomId);

    if (!room || room.ended) {
      return res.status(404).json({ error: 'Meeting room not found or ended' });
    }

    const map = roomParticipants.get(roomId);
    const participants = map ? Array.from(map.values()).map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      role: p.role,
      joinedAt: p.joinedAt,
      isMuted: p.isMuted,
      isVideoOff: p.isVideoOff,
      hasScreenShare: p.hasScreenShare,
      isAudioOnly: p.isAudioOnly
    })) : [];

    res.json({
      success: true,
      participants
    });
  } catch (error) {
    console.error('Error getting participants:', error);
    res.status(500).json({ error: 'Failed to get participants' });
  }
});

router.delete('/:roomId', protect, (req, res) => {
  try {
    const { roomId } = req.params;
    const room = activeRooms.get(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Meeting room not found' });
    }

    if (room.hostUserId !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only host can delete the meeting room' });
    }

    room.ended = true;
    room.isActive = false;
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

function generateRoomId() {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

module.exports = router;
