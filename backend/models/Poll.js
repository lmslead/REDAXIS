import mongoose from 'mongoose';

const pollOptionSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: true }
);

const pollVoteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    option: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    customText: {
      type: String,
      trim: true,
      default: '',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const pollSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    options: {
      type: [pollOptionSchema],
      default: [],
    },
    allowCustomOption: {
      type: Boolean,
      default: false,
    },
    audience: {
      type: {
        type: String,
        enum: ['all', 'department', 'custom'],
        default: 'all',
      },
      departmentIds: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Department',
        },
      ],
      userIds: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    votes: {
      type: [pollVoteSchema],
      default: [],
    },
  },
  { timestamps: true }
);

// Virtual to compute poll status based on schedule
pollSchema.virtual('status').get(function () {
  const now = new Date();
  
  if (!this.isActive) {
    return 'closed';
  }
  
  if (this.startDate && now < this.startDate) {
    return 'scheduled';
  }
  
  if (this.endDate && now > this.endDate) {
    return 'ended';
  }
  
  return 'active';
});

pollSchema.set('toJSON', { virtuals: true });
pollSchema.set('toObject', { virtuals: true });

const Poll = mongoose.model('Poll', pollSchema);

export default Poll;
