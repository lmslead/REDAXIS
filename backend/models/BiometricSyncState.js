import mongoose from 'mongoose';

const biometricSyncStateSchema = new mongoose.Schema({
  scope: {
    type: String,
    required: true,
    unique: true,
    default: 'attendance',
  },
  lastSyncedAt: {
    type: Date,
    default: new Date(0),
  },
  lastEmpCode: {
    type: String,
  },
  lastDeviceId: {
    type: String,
  },
  lastLogTimestamp: {
    type: Date,
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,
  }
}, {
  timestamps: true,
});

const BiometricSyncState = mongoose.model('BiometricSyncState', biometricSyncStateSchema);

export default BiometricSyncState;
