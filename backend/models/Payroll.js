import mongoose from 'mongoose';

const payrollSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12,
  },
  year: {
    type: Number,
    required: true,
  },
  basicSalary: {
    type: Number,
    required: true,
  },
  allowances: {
    hra: { type: Number, default: 0 },
    transport: { type: Number, default: 0 },
    medical: { type: Number, default: 0 },
    other: { type: Number, default: 0 },
  },
  deductions: {
    tax: { type: Number, default: 0 },
    providentFund: { type: Number, default: 0 },
    insurance: { type: Number, default: 0 },
    other: { type: Number, default: 0 },
  },
  bonus: {
    type: Number,
    default: 0,
  },
  overtimeHours: {
    type: Number,
    default: 0,
  },
  overtimePay: {
    type: Number,
    default: 0,
  },
  totalEarnings: {
    type: Number,
  },
  totalDeductions: {
    type: Number,
  },
  netSalary: {
    type: Number,
  },
  workingDays: {
    type: Number,
    default: 0,
  },
  presentDays: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['draft', 'processed', 'paid'],
    default: 'draft',
  },
  paymentDate: {
    type: Date,
  },
  paymentMethod: {
    type: String,
    enum: ['bank-transfer', 'cash', 'cheque'],
    default: 'bank-transfer',
  },
}, {
  timestamps: true,
});

// Calculate totals before saving
payrollSchema.pre('save', function(next) {
  const allowancesTotal = Object.values(this.allowances).reduce((sum, val) => sum + val, 0);
  const deductionsTotal = Object.values(this.deductions).reduce((sum, val) => sum + val, 0);
  
  this.totalEarnings = this.basicSalary + allowancesTotal + this.bonus + this.overtimePay;
  this.totalDeductions = deductionsTotal;
  this.netSalary = this.totalEarnings - this.totalDeductions;
  
  next();
});

const Payroll = mongoose.model('Payroll', payrollSchema);

export default Payroll;
