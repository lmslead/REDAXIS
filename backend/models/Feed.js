import mongoose from 'mongoose';

const feedSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    trim: true,
  },
  title: {
    type: String,
    trim: true,
  },
  subtitle: {
    type: String,
    trim: true,
  },
  type: {
    type: String,
    enum: ['announcement', 'update', 'achievement', 'event', 'general'],
    default: 'general',
  },
  layout: {
    type: String,
    enum: ['classic', 'spotlight', 'poster'],
    default: 'classic',
  },
  attachments: [{
    type: String,
  }],
  heroImage: {
    type: String,
  },
  accentColor: {
    type: String,
    default: '#2563eb',
  },
  ctaLabel: {
    type: String,
    trim: true,
  },
  ctaLink: {
    type: String,
    trim: true,
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    text: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

const Feed = mongoose.model('Feed', feedSchema);

export default Feed;
