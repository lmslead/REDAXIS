import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { syncBiometricLogs } from '../utils/biometricSyncService.js';

dotenv.config();

const modeArg = process.argv[2] || 'incremental';
const daysArg = Number(process.argv[3]);
const fromArg = process.argv[4];

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const result = await syncBiometricLogs({
      manualTrigger: true,
      forceResync: modeArg === 'full',
      lookbackDays: Number.isFinite(daysArg) ? daysArg : undefined,
      resyncFromDate: fromArg,
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error running biometric sync:', error);
  } finally {
    await mongoose.disconnect();
  }
};

run();
