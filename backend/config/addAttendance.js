import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Attendance from '../models/Attendance.js';
import User from '../models/User.js';

dotenv.config();

const addAttendanceRecords = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected');

    // Get all users
    const users = await User.find({});
    console.log(`📋 Found ${users.length} users`);

    // Generate attendance for October 2025 (last 30 days)
    const attendanceRecords = [];
    const today = new Date('2025-10-31');
    const daysToGenerate = 30;

    for (const user of users) {
      for (let i = 0; i < daysToGenerate; i++) {
        const attendanceDate = new Date(today);
        attendanceDate.setDate(today.getDate() - i);
        attendanceDate.setHours(0, 0, 0, 0);

        // Skip weekends (Saturday = 6, Sunday = 0)
        const dayOfWeek = attendanceDate.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          continue;
        }

        // 90% attendance rate - some random absences
        const isPresent = Math.random() > 0.1;
        
        if (isPresent) {
          // Random check-in time between 8:30 AM and 10:00 AM
          const checkInHour = 8 + Math.floor(Math.random() * 2);
          const checkInMinute = Math.floor(Math.random() * 60);
          const checkIn = new Date(attendanceDate);
          checkIn.setHours(checkInHour, checkInMinute, 0, 0);

          // Check-out 8-9 hours later
          const workHours = 8 + Math.random();
          const checkOut = new Date(checkIn.getTime() + workHours * 60 * 60 * 1000);

          attendanceRecords.push({
            employee: user._id,
            date: attendanceDate,
            checkIn: checkIn,
            checkOut: checkOut,
            status: 'present',
            workingHours: Math.round(workHours * 100) / 100,
          });
        } else {
          attendanceRecords.push({
            employee: user._id,
            date: attendanceDate,
            status: 'absent',
          });
        }
      }
    }

    // Clear existing attendance for October 2025
    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-10-31');
    endDate.setHours(23, 59, 59, 999);
    
    await Attendance.deleteMany({
      date: { $gte: startDate, $lte: endDate }
    });
    console.log('🗑️  Cleared existing October 2025 attendance');

    // Insert new attendance records
    await Attendance.insertMany(attendanceRecords);
    console.log(`✅ Added ${attendanceRecords.length} attendance records`);
    console.log(`📊 Records per user: ~${Math.floor(attendanceRecords.length / users.length)}`);

    console.log('\n🎉 Attendance data populated successfully!');
    console.log('📅 Period: October 1-31, 2025 (weekdays only)');
    console.log('👥 Users: All employees');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

addAttendanceRecords();