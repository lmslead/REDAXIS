import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const employeeId = process.argv[2];

if (!employeeId) {
  console.error('Usage: node scripts/findUserByEmployeeId.js <EMPLOYEE_ID>');
  process.exit(1);
}

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const user = await User.findOne({ employeeId: employeeId.trim() }).lean();
    if (!user) {
      console.log(`No user found with employeeId ${employeeId}`);
    } else {
      console.log(JSON.stringify({
        _id: user._id,
        employeeId: user.employeeId,
        biometricCode: user.biometricCode,
        firstName: user.firstName,
        lastName: user.lastName,
        managementLevel: user.managementLevel,
      }, null, 2));
    }
  } catch (error) {
    console.error('Error fetching user:', error);
  } finally {
    await mongoose.disconnect();
  }
};

run();
