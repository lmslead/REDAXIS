import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  isGroupChat: {
    type: Boolean,
    default: false,
  },
  groupName: {
    type: String,
  },
  messages: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  }],
  lastMessage: {
    type: String,
  },
  lastMessageTime: {
    type: Date,
  },
}, {
  timestamps: true,
});

const Chat = mongoose.model('Chat', chatSchema);

export default Chat;
