import mongoose from 'mongoose';

const leaveSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  leaveType: {
    type: String,
    enum: ['sick', 'casual', 'earned', 'maternity', 'paternity', 'unpaid', 'half-day'],
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  days: {
    type: Number,
    required: true,
  },
  reason: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvalDate: {
    type: Date,
  },
  remarks: {
    type: String,
  },
  // === ESCALATION WORKFLOW FIELDS ===
  approvalLevel: {
    type: Number,
    default: 1, // 1=L1(RM), 2=L2(Senior Manager), 3=L3(Admin)
  },
  currentApprover: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Current person who needs to approve
  },
  approvalDeadline: {
    type: Date, // Auto-set to 48 hours from submission
  },
  escalatedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Person leave was escalated to
  },
  escalationDate: {
    type: Date,
  },
  isEscalated: {
    type: Boolean,
    default: false,
  },
  approvalHistory: [{
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    action: {
      type: String,
      enum: ['approved', 'rejected', 'escalated'],
    },
    date: {
      type: Date,
      default: Date.now,
    },
    remarks: String,
    level: Number,
  }],
}, {
  timestamps: true,
});

// Auto-set approval deadline and current approver before saving new leave
leaveSchema.pre('save', async function(next) {
  if (this.isNew) {
    // Set approval deadline to 48 hours from now
    this.approvalDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000);
    
    // Find and set the current approver (employee's reporting manager)
    const User = mongoose.model('User');
    const employee = await User.findById(this.employee);
    if (employee && employee.reportingManager) {
      this.currentApprover = employee.reportingManager;
      const manager = await User.findById(employee.reportingManager);
      if (manager) {
        this.approvalLevel = manager.managementLevel;
      }
    }
  }
  next();
});

const Leave = mongoose.model('Leave', leaveSchema);

export default Leave;
