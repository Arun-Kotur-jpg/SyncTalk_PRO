import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['direct', 'group'],
      required: true,
    },
    name: {
      type: String,
      default: null,
      trim: true,
      maxlength: 60,
    },
    description: {
      type: String,
      default: '',
      maxlength: 200,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    mutedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  { timestamps: true }
);

// Index for fast lookup of user's conversations
conversationSchema.index({ participants: 1 });
// Prevent duplicate direct conversations
conversationSchema.index(
  { type: 1, participants: 1 },
  { unique: false }
);

const Conversation = mongoose.model('Conversation', conversationSchema);
export default Conversation;
