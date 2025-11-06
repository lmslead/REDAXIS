import mongoose from 'mongoose';

const recognitionSchema = new mongoose.Schema({
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ['teamwork', 'innovation', 'leadership', 'excellence', 'dedication'],
    default: 'excellence',
  },
  badge: {
    type: String,
  },
  isPublic: {
    type: Boolean,
    default: true,
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
}, {
  timestamps: true,
});

const Recognition = mongoose.model('Recognition', recognitionSchema);

export default Recognition;
