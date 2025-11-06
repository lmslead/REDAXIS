import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
  },
  positions: [{
    type: String,
    trim: true,
  }],
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  employees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

const Department = mongoose.model('Department', departmentSchema);

export default Department;
