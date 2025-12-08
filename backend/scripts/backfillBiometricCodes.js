import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const users = await User.find({});
    let updated = 0;

    for (const user of users) {
      const normalized = user.employeeId ? user.employeeId.trim().toUpperCase() : null;
      if (normalized && user.biometricCode !== normalized) {
        user.biometricCode = normalized;
        await user.save();
        updated += 1;
      }
    }

    console.log(`Updated biometric codes for ${updated} users.`);
  } catch (error) {
    console.error('Error backfilling biometric codes:', error);
  } finally {
    await mongoose.disconnect();
  }
};

run();
