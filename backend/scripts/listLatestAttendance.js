import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Attendance from '../models/Attendance.js';
import User from '../models/User.js';

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const records = await Attendance.find({})
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate('employee', 'employeeId firstName lastName')
      .lean();
    console.log(JSON.stringify(records, null, 2));
  } catch (error) {
    console.error('Error listing attendance:', error);
  } finally {
    await mongoose.disconnect();
  }
};

run();
