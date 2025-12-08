import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  checkIn: {
    type: Date,
  },
  checkOut: {
    type: Date,
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'half-day', 'on-leave', 'holiday'],
    default: 'present',
  },
  source: {
    type: String,
    enum: ['manual', 'device', 'leave'],
    default: 'manual',
  },
  workingHours: {
    type: Number,
    default: 0,
  },
  notes: {
    type: String,
  },
  deviceSyncMeta: {
    empCode: { type: String },
    deviceId: { type: String },
    logsCount: { type: Number },
    lastLogTimestamp: { type: Date },
    manualTrigger: { type: Boolean },
  },
  // Location tracking for check-in/out
  checkInLocation: {
    latitude: { type: Number },
    longitude: { type: Number },
    accuracy: { type: Number },
    address: { type: String },
    networkInfo: {
      ip: { type: String },
      userAgent: { type: String },
      wifiSSID: { type: String }
    },
    distanceFromOffice: { type: Number }, // in meters
    locationVerified: { type: Boolean, default: false }
  },
  checkOutLocation: {
    latitude: { type: Number },
    longitude: { type: Number },
    accuracy: { type: Number },
    address: { type: String },
    networkInfo: {
      ip: { type: String },
      userAgent: { type: String },
      wifiSSID: { type: String }
    },
    distanceFromOffice: { type: Number }, // in meters
    locationVerified: { type: Boolean, default: false }
  }
}, {
  timestamps: true,
});

// Create compound index for employee and date
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance;
