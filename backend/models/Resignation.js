import mongoose from 'mongoose';

const resignationSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  resignationDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  lastWorkingDate: {
    type: Date,
    required: true,
  },
  reason: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending',
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvalDate: {
    type: Date,
  },
  approvalRemarks: {
    type: String,
  },
  // Exit Procedures Checklist
  exitProcedures: {
    assetReturn: {
      status: {
        type: String,
        enum: ['pending', 'completed'],
        default: 'pending',
      },
      completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      completedDate: Date,
      remarks: String,
    },
    exitInterview: {
      status: {
        type: String,
        enum: ['pending', 'completed'],
        default: 'pending',
      },
      completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      completedDate: Date,
      remarks: String,
    },
    knowledgeTransfer: {
      status: {
        type: String,
        enum: ['pending', 'completed'],
        default: 'pending',
      },
      completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      completedDate: Date,
      remarks: String,
    },
    clearance: {
      status: {
        type: String,
        enum: ['pending', 'completed'],
        default: 'pending',
      },
      completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      completedDate: Date,
      remarks: String,
    },
    finalSettlement: {
      status: {
        type: String,
        enum: ['pending', 'completed'],
        default: 'pending',
      },
      completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      completedDate: Date,
      remarks: String,
    },
  },
}, {
  timestamps: true,
});

const Resignation = mongoose.model('Resignation', resignationSchema);

export default Resignation;
