import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import Leave from '../models/Leave.js';
import Event from '../models/Event.js';

export const getDashboardStats = async (req, res) => {
  try {
    const totalEmployees = await User.countDocuments({ role: { $ne: 'admin' } });
    const activeEmployees = await User.countDocuments({ status: 'active' });
    const onLeaveEmployees = await User.countDocuments({ status: 'on-leave' });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayAttendance = await Attendance.countDocuments({
      date: today,
      status: 'present',
    });

    const pendingLeaves = await Leave.countDocuments({ status: 'pending' });
    
    const upcomingEvents = await Event.countDocuments({
      date: { $gte: new Date() },
      status: 'scheduled',
    });

    res.status(200).json({
      success: true,
      data: {
        totalEmployees,
        activeEmployees,
        onLeaveEmployees,
        todayAttendance,
        pendingLeaves,
        upcomingEvents,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
