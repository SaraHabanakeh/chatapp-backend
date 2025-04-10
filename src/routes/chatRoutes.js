import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Chat from '../models/Chat.js';
import mongoose from 'mongoose';

const router = express.Router();

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded);
    req.userId = decoded.id;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Get all chats for a user
router.get('/', verifyToken, async (req, res) => {
  try {
    const chats = await Chat.find({ participants: req.userId })
      .populate('participants', 'username profilePicture status')
      .populate('lastMessage.sender', 'username')
      .sort({ 'lastMessage.timestamp': -1 });

    res.json(chats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Helper function to format chat response
async function formatChatResponse(chat, userId, isGroup) {
  // First populate the chat with participants
  const populatedChat = await Chat.findById(chat._id)
    .populate({
      path: 'participants',
      select: 'username profilePicture status'
    })
    .populate('groupAdmin', 'username profilePicture');

  console.log('Populated chat:', {
    _id: populatedChat._id,
    participantCount: populatedChat.participants.length,
    rawParticipants: populatedChat.participants.map(p => ({
      id: p._id,
      username: p.username
    }))
  });

  return {
    _id: populatedChat._id.toString(),
    isGroup: populatedChat.isGroup,
    groupName: populatedChat.groupName,
    participants: populatedChat.participants.map(participant => ({
      id: participant._id.toString(),
      username: participant.username,
      profilePicture: participant.profilePicture,
      status: participant.status
    })),
    groupAdmin: isGroup ? {
      id: userId,
      username: populatedChat.groupAdmin?.username || '',
      profilePicture: populatedChat.groupAdmin?.profilePicture || ''
    } : null,
    messages: populatedChat.messages || [],
    lastMessage: populatedChat.lastMessage || null,
    createdAt: populatedChat.createdAt,
    updatedAt: populatedChat.updatedAt
  };
}

// Create a new chat
router.post('/', verifyToken, async (req, res) => {
  try {
    const { participants, isGroup, groupName } = req.body;
    
    console.log('Creating new chat:', {
      participants,
      isGroup,
      groupName,
      userId: req.userId
    });
    
    // Add current user to participants and ensure all IDs are valid ObjectIds
    const allParticipants = [...new Set([...participants, req.userId])]
      .filter(id => mongoose.Types.ObjectId.isValid(id))
      .map(id => new mongoose.Types.ObjectId(id));

    console.log('Processed participants:', allParticipants);
    
    // Check if chat already exists
    const existingChat = await Chat.findOne({
      participants: { $all: allParticipants },
      isGroup: false
    });

    if (existingChat && !isGroup) {
      console.log('Found existing chat:', existingChat._id);
      const formattedExistingChat = await formatChatResponse(existingChat, req.userId, isGroup);
      return res.json(formattedExistingChat);
    }

    const chat = new Chat({
      participants: allParticipants,
      isGroup,
      groupName,
      groupAdmin: isGroup ? req.userId : null
    });

    await chat.save();
    console.log('Created new chat:', chat._id);
    
    // Format and return the response
    const formattedChat = await formatChatResponse(chat, req.userId, isGroup);
    console.log('Returning formatted chat:', {
      id: formattedChat._id,
      participants: formattedChat.participants.map(p => p.id)
    });
    
    res.status(201).json(formattedChat);
  } catch (error) {
    console.error('Error creating chat:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get messages for a specific chat
router.get('/:chatId/messages', verifyToken, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId)
      .populate('messages.sender', 'username profilePicture')
      .populate('messages.readBy', 'username');

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check if user is a participant by converting ObjectIds to strings
    if (!chat.participants.some(participantId => participantId.toString() === req.userId)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(chat.messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Send a message
router.post('/:chatId/messages', verifyToken, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content } = req.body;

    console.log('Received message request:', {
      chatId,
      userId: req.userId,
      content
    });

    // Validate chatId
    if (!chatId || !mongoose.Types.ObjectId.isValid(chatId)) {
      console.log('Invalid chat ID:', chatId);
      return res.status(400).json({ message: 'Invalid chat ID' });
    }

    const chat = await Chat.findById(chatId);
    console.log('Found chat:', chat ? {
      id: chat._id,
      participants: chat.participants,
      messages: chat.messages.length
    } : null);

    if (!chat) {
      console.log('Chat not found with ID:', chatId);
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check if user is a participant by converting ObjectIds to strings
    const isParticipant = chat.participants.some(participantId => {
      const participantIdStr = participantId.toString();
      const userIdStr = req.userId.toString();
      const matches = participantIdStr === userIdStr;
      console.log('Comparing participant:', {
        participantId: participantIdStr,
        userId: userIdStr,
        matches
      });
      return matches;
    });

    if (!isParticipant) {
      console.log('User not authorized:', {
        userId: req.userId,
        participants: chat.participants.map(p => p.toString())
      });
      return res.status(403).json({ message: 'Not authorized' });
    }

    const message = {
      sender: req.userId,
      content,
      readBy: [req.userId]
    };

    chat.messages.push(message);
    chat.lastMessage = message;
    await chat.save();

    // Get sender details
    const sender = await User.findById(req.userId.toString());
    //const sender = await User.findById(new mongoose.Types.ObjectId(req.userId));
    if (!sender) {
      console.log('Sender not found here:', req.userId.toString(), sender);
      return res.status(404).json({ message: 'Sender not found' });
    }

    // Populate the message with sender details
    const populatedMessage = {
      ...message,
      sender: {
        id: sender._id,
        username: sender.username,
        profilePicture: sender.profilePicture
      }
    };

    console.log('Successfully sent message:', populatedMessage);
    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router; 