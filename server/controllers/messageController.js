import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';

// GET /api/messages/:conversationId
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const messages = await Message.find({ conversation: conversationId })
      .populate('sender', 'username avatar')
      .populate('replyTo', 'content sender')
      .populate('mentions', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Message.countDocuments({ conversation: conversationId });

    res.json({
      messages: messages.reverse(), // Return in chronological order
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
};

// GET /api/messages/:conversationId/search?q=keyword
export const searchMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    const messages = await Message.find({
      conversation: conversationId,
      $text: { $search: q },
    })
      .populate('sender', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(messages);
  } catch (error) {
    // Fallback to regex search if text index not available
    try {
      const { conversationId } = req.params;
      const { q } = req.query;
      const messages = await Message.find({
        conversation: conversationId,
        content: { $regex: q, $options: 'i' },
      })
        .populate('sender', 'username avatar')
        .sort({ createdAt: -1 })
        .limit(50);

      res.json(messages);
    } catch (fallbackError) {
      res.status(500).json({ message: 'Search failed' });
    }
  }
};

// GET /api/messages/user/mentions
export const getMentions = async (req, res) => {
  try {
    const messages = await Message.find({
      mentions: req.user._id,
      clearedMentions: { $ne: req.user._id }
    })
      .populate('sender', 'username avatar')
      .populate('conversation', 'name type')
      .sort({ createdAt: -1 })
      .limit(8);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch mentions' });
  }
};

// @desc    Clear a mention for the current user
// @route   DELETE /api/messages/:messageId/mentions
// @access  Private
export const clearMention = async (req, res) => {
  try {
    const message = await Message.findByIdAndUpdate(
      req.params.messageId,
      { $addToSet: { clearedMentions: req.user._id } },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    res.json({ message: 'Mention cleared' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to clear mention' });
  }
};

// PUT /api/messages/:id
export const editMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    
    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only edit your own messages' });
    }

    // 15-minute edit window
    const fifteenMins = 15 * 60 * 1000;
    if (Date.now() - new Date(message.createdAt).getTime() > fifteenMins) {
      return res.status(403).json({ message: 'Messages can only be edited within 15 minutes' });
    }

    message.content = content;
    message.edited = true;
    await message.save();

    const populated = await message.populate([
      { path: 'sender', select: 'username avatar' },
      { path: 'replyTo', select: 'content sender' },
      { path: 'mentions', select: 'username' },
    ]);

    req.app.get('io').to(message.conversation.toString()).emit('message_edited', populated);

    res.json(populated);
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ message: 'Failed to edit message' });
  }
};

// DELETE /api/messages/:id
export const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const soft = req.query.soft === 'true';

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own messages' });
    }

    const conversationId = message.conversation.toString();

    if (soft) {
      message.content = 'This message was deleted';
      message.type = 'system';
      message.voiceUrl = null;
      await message.save();
      
      const populated = await message.populate([
        { path: 'sender', select: 'username avatar' },
      ]);
      req.app.get('io').to(conversationId).emit('message_edited', populated); // Update UI like an edit
      return res.json(populated);
    } else {
      await Message.findByIdAndDelete(id);
      req.app.get('io').to(conversationId).emit('message_deleted', { messageId: id, conversationId });
      return res.json({ message: 'Message deleted' });
    }
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Failed to delete message' });
  }
};

// POST /api/messages/:id/react
export const toggleReaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    if (!emoji) {
      return res.status(400).json({ message: 'Emoji is required' });
    }

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const reactionIndex = message.reactions.findIndex(r => r.emoji === emoji);

    if (reactionIndex > -1) {
      // Reaction exists, check if user has reacted
      const userIndex = message.reactions[reactionIndex].users.indexOf(userId);
      if (userIndex > -1) {
        // Remove user from reaction
        message.reactions[reactionIndex].users.splice(userIndex, 1);
        // Remove reaction entirely if no users left
        if (message.reactions[reactionIndex].users.length === 0) {
          message.reactions.splice(reactionIndex, 1);
        }
      } else {
        // Add user to reaction
        message.reactions[reactionIndex].users.push(userId);
      }
    } else {
      // New reaction
      message.reactions.push({ emoji, users: [userId] });
    }

    await message.save();

    const populated = await message.populate([
      { path: 'sender', select: 'username avatar' },
      { path: 'replyTo', select: 'content sender' },
      { path: 'mentions', select: 'username' },
    ]);

    req.app.get('io').to(message.conversation.toString()).emit('message_edited', populated);

    res.json(populated);
  } catch (error) {
    console.error('Toggle reaction error:', error);
    res.status(500).json({ message: 'Failed to toggle reaction' });
  }
};

// POST /api/messages/:id/pin
export const togglePin = async (req, res) => {
  try {
    const { id } = req.params;
    
    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    message.isPinned = !message.isPinned;
    await message.save();

    const populated = await message.populate([
      { path: 'sender', select: 'username avatar' },
      { path: 'replyTo', select: 'content sender' },
      { path: 'mentions', select: 'username' },
    ]);

    req.app.get('io').to(message.conversation.toString()).emit('message_edited', populated);

    res.json(populated);
  } catch (error) {
    console.error('Toggle pin error:', error);
    res.status(500).json({ message: 'Failed to toggle pin' });
  }
};
