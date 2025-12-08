import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';

dotenv.config();

const employeeId = process.argv[2];

if (!employeeId) {
  console.error('Usage: node scripts/listAttendanceForUser.js <EMPLOYEE_ID>');
  process.exit(1);
}

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const user = await User.findOne({ employeeId: employeeId.trim() });
    if (!user) {
      console.log(`No user found with employeeId ${employeeId}`);
      return;
    }

    const records = await Attendance.find({ employee: user._id })
      .sort({ date: -1 })
      .limit(10)
      .lean();

    console.log(JSON.stringify(records, null, 2));
  } catch (error) {
    console.error('Error fetching attendance:', error);
  } finally {
    await mongoose.disconnect();
  }
};

run();
