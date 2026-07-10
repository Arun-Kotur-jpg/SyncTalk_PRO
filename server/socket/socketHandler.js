import { verifyAccessToken } from '../utils/token.js';
import User from '../models/User.js';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import ConversationRead from '../models/ConversationRead.js';

// Track online users: userId -> Set of socketIds
const onlineUsers = new Map();
// Track disconnect timeouts: userId -> timeoutId
const disconnectTimeouts = new Map();

const setupSocket = (io) => {
  // Auth middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.id).select('-password -refreshToken');
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    console.log(`User connected: ${socket.user.username} (${socket.id})`);

    // Clear any pending disconnect timeout
    if (disconnectTimeouts.has(userId)) {
      clearTimeout(disconnectTimeouts.get(userId));
      disconnectTimeouts.delete(userId);
    } else {
      // Only broadcast if they were truly offline
      if (!onlineUsers.has(userId) || onlineUsers.get(userId).size === 0) {
        socket.broadcast.emit('user_online', { userId, username: socket.user.username });
      }
    }

    // Track online status
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Rate limiting state: 20 messages per 10 seconds
    const messageRateLimit = { count: 0, firstMessageTime: Date.now() };

    // Send current online users list to newly connected user
    const onlineList = Array.from(onlineUsers.keys());
    socket.emit('online_users', onlineList);

    // --- Join Room ---
    socket.on('join_room', async ({ conversationId }) => {
      try {
        // Verify membership
        const conversation = await Conversation.findById(conversationId);
        if (!conversation || !conversation.participants.includes(userId)) {
          return socket.emit('error', { message: 'Not a member of this conversation' });
        }

        socket.join(conversationId);
        socket.emit('joined_room', { conversationId });
      } catch (error) {
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // --- Leave Room ---
    socket.on('leave_room', ({ conversationId }) => {
      socket.leave(conversationId);
    });

    // --- Send Message ---
    socket.on('send_message', async (data) => {
      try {
        // Rate limiting check
        const now = Date.now();
        if (now - messageRateLimit.firstMessageTime > 10000) {
          messageRateLimit.count = 1;
          messageRateLimit.firstMessageTime = now;
        } else {
          messageRateLimit.count++;
          if (messageRateLimit.count > 20) {
            return socket.emit('error', { message: 'Rate limit exceeded. Please slow down.' });
          }
        }

        const { conversationId, content, type = 'text', voiceUrl, replyTo, mentions, attachments } = data;

        // Verify membership
        const conversation = await Conversation.findById(conversationId);
        if (!conversation || !conversation.participants.includes(userId)) {
          return socket.emit('error', { message: 'Not authorized to send messages here' });
        }

        // Create message
        const message = await Message.create({
          conversation: conversationId,
          sender: userId,
          content: content || '',
          type,
          voiceUrl: voiceUrl || null,
          replyTo: replyTo || null,
          mentions: mentions || [],
          attachments: attachments || [],
          readBy: [userId],
          delivered: true,
        });

        // Populate sender info
        const populated = await message.populate([
          { path: 'sender', select: 'username avatar' },
          { path: 'replyTo', select: 'content sender' },
          { path: 'mentions', select: 'username' },
        ]);

        // Update conversation timestamp
        conversation.updatedAt = new Date();
        await conversation.save();

        // Broadcast to room
        io.to(conversationId).emit('new_message', populated);

        // Send delivery confirmation to sender
        socket.emit('message_delivered', { messageId: message._id });

        // Send mention notifications
        if (mentions && mentions.length > 0) {
          for (const mentionedUserId of mentions) {
            const mentionedSockets = onlineUsers.get(mentionedUserId);
            if (mentionedSockets) {
              for (const sid of mentionedSockets) {
                io.to(sid).emit('mention_notification', {
                  messageId: message._id,
                  conversationId,
                  from: socket.user.username,
                  content: content?.slice(0, 100),
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // --- Typing Indicator ---
    socket.on('typing', ({ conversationId }) => {
      socket.to(conversationId).emit('user_typing', {
        userId,
        username: socket.user.username,
        conversationId,
      });
    });

    socket.on('stop_typing', ({ conversationId }) => {
      socket.to(conversationId).emit('user_stop_typing', {
        userId,
        conversationId,
      });
    });

    // --- Read Receipt ---
    socket.on('mark_read', async ({ conversationId, messageId }) => {
      try {
        if (messageId) {
          // Mark specific message as read
          await Message.findByIdAndUpdate(messageId, {
            $addToSet: { readBy: userId },
          });
          io.to(conversationId).emit('message_read', { messageId, userId });
        } else {
          // Mark all messages in conversation as read
          await Message.updateMany(
            { conversation: conversationId, readBy: { $ne: userId } },
            { $addToSet: { readBy: userId } }
          );
          io.to(conversationId).emit('messages_read', { conversationId, userId });
        }
      } catch (error) {
        console.error('Mark read error:', error);
      }
    });

    // --- Mark Conversation Read ---
    socket.on('mark_conversation_read', async ({ conversationId }) => {
      try {
        await ConversationRead.findOneAndUpdate(
          { user: userId, conversation: conversationId },
          { lastReadAt: new Date() },
          { upsert: true, new: true }
        );
        // Also update old messages
        await Message.updateMany(
          { conversation: conversationId, readBy: { $ne: userId } },
          { $addToSet: { readBy: userId } }
        );
        io.to(conversationId).emit('messages_read', { conversationId, userId });
      } catch (error) {
        console.error('Mark conversation read error:', error);
      }
    });

    // --- Summary Created Notification ---
    socket.on('summary_created', ({ conversationId, summary }) => {
      io.to(conversationId).emit('new_summary', { summary });
    });

    // --- Disconnect ---
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.user.username} (${socket.id})`);

      // Remove from online tracking
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);
          
          // Delay offline broadcast by 5 seconds to handle quick reconnects
          const timeoutId = setTimeout(async () => {
            socket.broadcast.emit('user_offline', { userId });
            await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
            disconnectTimeouts.delete(userId);
          }, 5000);
          
          disconnectTimeouts.set(userId, timeoutId);
        }
      }
    });
  });
};

export default setupSocket;
