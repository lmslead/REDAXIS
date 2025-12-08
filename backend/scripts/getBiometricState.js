import mongoose from 'mongoose';
import dotenv from 'dotenv';
import BiometricSyncState from '../models/BiometricSyncState.js';

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const state = await BiometricSyncState.find().lean();
    console.log(JSON.stringify(state, null, 2));
  } catch (error) {
    console.error('Error fetching sync state:', error);
  } finally {
    await mongoose.disconnect();
  }
};

run();
