import mongoose from 'mongoose';

const conversationReadSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    lastReadAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// A user can only have one read marker per conversation
conversationReadSchema.index({ user: 1, conversation: 1 }, { unique: true });

const ConversationRead = mongoose.model('ConversationRead', conversationReadSchema);

export default ConversationRead;
