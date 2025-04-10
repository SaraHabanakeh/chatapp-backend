import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Chat from '../models/Chat.js';

export const setupSocketHandlers = (io) => {
  // Store online users
  const onlineUsers = new Map();

  io.on('connection', async (socket) => {
    console.log('New client connected');

    // Handle authentication
    const token = socket.handshake.auth.token;
    if (!token) {
      socket.disconnect();
      return;
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user) {
        socket.disconnect();
        return;
      }

      // Update user status
      user.status = 'online';
      user.lastSeen = new Date();
      await user.save();

      // Store socket ID
      onlineUsers.set(user._id.toString(), socket.id);

      // Join user's rooms
      const chats = await Chat.find({ participants: user._id });
      chats.forEach(chat => {
        socket.join(chat._id.toString());
      });

      // Notify others about user's online status
      socket.broadcast.emit('userStatus', {
        userId: user._id,
        status: 'online'
      });

      // Handle disconnection
      socket.on('disconnect', async () => {
        console.log('Client disconnected');
        onlineUsers.delete(user._id.toString());
        
        // Update user status
        user.status = 'offline';
        user.lastSeen = new Date();
        await user.save();

        // Notify others about user's offline status
        socket.broadcast.emit('userStatus', {
          userId: user._id,
          status: 'offline'
        });
      });

      // Handle new message
      socket.on('sendMessage', async (data) => {
        try {
          const { chatId, content } = data;
          const chat = await Chat.findById(chatId);

          if (!chat || !chat.participants.includes(user._id)) {
            return;
          }

          const message = {
            sender: user._id,
            content,
            readBy: [user._id]
          };

          chat.messages.push(message);
          chat.lastMessage = message;

          // Update unread counts for all participants except the sender
          chat.participants.forEach(participantId => {
            if (participantId.toString() !== user._id.toString()) {
              const existingCount = chat.unreadCounts.find(count => 
                count.user.toString() === participantId.toString()
              );
              
              if (existingCount) {
                existingCount.count += 1;
              } else {
                chat.unreadCounts.push({
                  user: participantId,
                  count: 1
                });
              }
            }
          });

          await chat.save();

          // Get the populated chat with the new message
          const populatedChat = await Chat.findById(chat._id)
            .populate('messages.sender', 'username profilePicture')
            .populate('lastMessage.sender', 'username profilePicture')
            .populate('unreadCounts.user', 'username');

          // Get the last message (which is our new message)
          const populatedMessage = populatedChat.messages[populatedChat.messages.length - 1];

          // Emit message to all participants in the chat
          io.to(chatId).emit('newMessage', {
            chatId,
            message: populatedMessage,
            unreadCounts: populatedChat.unreadCounts
          });

          // Notify participants who are not in the chat
          chat.participants.forEach(participantId => {
            if (participantId.toString() !== user._id.toString()) {
              const participantSocketId = onlineUsers.get(participantId.toString());
              if (participantSocketId) {
                io.to(participantSocketId).emit('newMessageNotification', {
                  chatId,
                  message: populatedMessage,
                  unreadCounts: populatedChat.unreadCounts
                });
              }
            }
          });
        } catch (error) {
          console.error('Error sending message:', error);
        }
      });

      // Handle message read
      socket.on('markMessageAsRead', async (data) => {
        try {
          const { chatId, messageId } = data;
          const chat = await Chat.findById(chatId);

          if (!chat || !chat.participants.includes(user._id)) {
            return;
          }

          const message = chat.messages.id(messageId);
          if (message && !message.readBy.includes(user._id)) {
            message.readBy.push(user._id);
            
            // Reset unread count for this user
            const userUnreadCount = chat.unreadCounts.find(count => 
              count.user.toString() === user._id.toString()
            );
            if (userUnreadCount) {
              userUnreadCount.count = 0;
            }
            
            await chat.save();

            // Notify other participants
            socket.to(chatId).emit('messageRead', {
              chatId,
              messageId,
              readBy: user._id,
              unreadCounts: chat.unreadCounts
            });
          }
        } catch (error) {
          console.error('Error marking message as read:', error);
        }
      });

    } catch (error) {
      console.error('Authentication error:', error);
      socket.disconnect();
    }
  });
}; 