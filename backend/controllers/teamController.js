import User from '../models/User.js';
import Leave from '../models/Leave.js';
import Attendance from '../models/Attendance.js';

// @desc    Get team members for current manager
// @route   GET /api/team/members
// @access  Private (L1, L2, L3)
export const getTeamMembers = async (req, res) => {
  try {
    if (!req.user.canManageAttendance && req.user.managementLevel === 0) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to view team members' 
      });
    }

    const userLevel = req.user.managementLevel;
    let teamMembers = [];

    // Get current user details to include in results
    const currentUser = await User.findById(req.user.id)
      .populate('department', 'name')
      .populate('reportingManager', 'firstName lastName')
      .select('-password');

    // L1: Get self + direct reports
    if (userLevel === 1) {
      const directReports = await User.find({
        reportingManager: req.user.id,
        isActive: true
      })
      .populate('department', 'name')
      .populate('reportingManager', 'firstName lastName')
      .select('-password')
      .sort({ firstName: 1 });

      // Include self first, then team members
      teamMembers = [currentUser, ...directReports];
    }
    // L2: Get self + ONLY direct reports (not downstream hierarchy)
    else if (userLevel === 2) {
      // Get ONLY direct reports (regardless of level)
      const directReports = await User.find({
        reportingManager: req.user.id,
        isActive: true
      })
      .populate('department', 'name')
      .populate('reportingManager', 'firstName lastName')
      .select('-password')
      .sort({ firstName: 1 });

      // Include self first, then direct reports only
      teamMembers = [currentUser, ...directReports];
    }
    // L3 (Admin): ONLY direct reports (can view all for admin tasks but team = direct reports)
    else if (userLevel === 3) {
      const directReports = await User.find({
        reportingManager: req.user.id,
        isActive: true
      })
      .populate('department', 'name')
      .populate('reportingManager', 'firstName lastName')
      .select('-password')
      .sort({ firstName: 1 });

      // Include self first, then direct reports only
      teamMembers = [currentUser, ...directReports];
    }
    // L4 (CEO/Owner): ONLY direct reports (can view all for admin tasks but team = direct reports)
    else if (userLevel >= 4) {
      const directReports = await User.find({
        reportingManager: req.user.id,
        isActive: true
      })
      .populate('department', 'name')
      .populate('reportingManager', 'firstName lastName')
      .select('-password')
      .sort({ firstName: 1 });

      // Include self first, then direct reports only
      teamMembers = [currentUser, ...directReports];
    }

    res.json({
      success: true,
      data: teamMembers,
      count: teamMembers.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get team statistics
// @route   GET /api/team/stats
// @access  Private (L1, L2, L3)
export const getTeamStats = async (req, res) => {
  try {
    if (!req.user.canManageAttendance && req.user.managementLevel === 0) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized' 
      });
    }

    const userLevel = req.user.managementLevel;
    let teamMemberIds = [];

    // Get team member IDs based on management level
    if (userLevel === 1) {
      // L1: Query ONLY direct reports (regardless of level)
      const directReports = await User.find({
        reportingManager: req.user.id,
        isActive: true
      }).select('_id');
      
      teamMemberIds = directReports.map(u => u._id);
    } else if (userLevel === 2) {
      // L2: ONLY direct reports (not downstream hierarchy)
      const directReports = await User.find({
        reportingManager: req.user.id,
        isActive: true
      }).select('_id');
      
      teamMemberIds = directReports.map(u => u._id);
    } else if (userLevel === 3) {
      // L3 (Admin): ONLY direct reports
      const directReports = await User.find({
        reportingManager: req.user.id,
        isActive: true
      }).select('_id');
      
      teamMemberIds = directReports.map(u => u._id);
    } else if (userLevel >= 4) {
      // L4 (CEO/Owner): ONLY direct reports
      const directReports = await User.find({
        reportingManager: req.user.id,
        isActive: true
      }).select('_id');
      
      teamMemberIds = directReports.map(u => u._id);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get team size
    const teamSize = teamMemberIds.length;

    // Get today's attendance
    const todayAttendance = await Attendance.find({
      employee: { $in: teamMemberIds },
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    const present = todayAttendance.filter(a => a.status === 'present').length;
    const absent = todayAttendance.filter(a => a.status === 'absent').length;
    const onLeave = todayAttendance.filter(a => a.status === 'on-leave' || a.status === 'half-day').length;

    // Get pending leaves
    const pendingLeaves = await Leave.find({
      employee: { $in: teamMemberIds },
      status: 'pending'
    }).populate('employee', 'firstName lastName employeeId');

    // Get this month's attendance
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlyAttendance = await Attendance.find({
      employee: { $in: teamMemberIds },
      date: { $gte: firstDayOfMonth }
    });

    // Calculate average attendance rate
    const workingDaysThisMonth = Math.floor((today - firstDayOfMonth) / (1000 * 60 * 60 * 24)) + 1;
    const expectedAttendance = teamSize * workingDaysThisMonth;
    const actualPresent = monthlyAttendance.filter(a => a.status === 'present').length;
    const attendanceRate = expectedAttendance > 0 
      ? ((actualPresent / expectedAttendance) * 100).toFixed(1) 
      : 0;

    res.json({
      success: true,
      data: {
        teamSize,
        todayStats: {
          present,
          absent,
          onLeave,
          notMarked: teamSize - (present + absent + onLeave)
        },
        pendingLeaves: pendingLeaves.length,
        pendingLeaveDetails: pendingLeaves,
        monthlyAttendanceRate: parseFloat(attendanceRate),
        workingDaysThisMonth
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get team attendance for a specific date or range
// @route   GET /api/team/attendance
// @access  Private (L1, L2, L3)
export const getTeamAttendance = async (req, res) => {
  try {
    if (!req.user.canManageAttendance && req.user.managementLevel === 0) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized' 
      });
    }

    const { startDate, endDate, month, year } = req.query;
    const userLevel = req.user.managementLevel;
    let teamMemberIds = [];

    // Get team member IDs based on management level
    if (userLevel === 1) {
      // L1: Query ONLY direct reports (regardless of level)
      const directReports = await User.find({
        reportingManager: req.user.id,
        isActive: true
      }).select('_id');
      
      teamMemberIds = directReports.map(u => u._id);
    } else if (userLevel === 2) {
      // L2: ONLY direct reports (not downstream hierarchy)
      const directReports = await User.find({
        reportingManager: req.user.id,
        isActive: true
      }).select('_id');
      
      teamMemberIds = directReports.map(u => u._id);
    } else if (userLevel === 3) {
      // L3 (Admin): ONLY direct reports
      const directReports = await User.find({
        reportingManager: req.user.id,
        isActive: true
      }).select('_id');
      
      teamMemberIds = directReports.map(u => u._id);
    } else if (userLevel >= 4) {
      // L4 (CEO/Owner): ONLY direct reports
      const directReports = await User.find({
        reportingManager: req.user.id,
        isActive: true
      }).select('_id');
      
      teamMemberIds = directReports.map(u => u._id);
    }

    let query = {
      employee: { $in: teamMemberIds }
    };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);
      query.date = {
        $gte: start,
        $lte: end
      };
    }

    const attendance = await Attendance.find(query)
      .populate('employee', 'firstName lastName employeeId')
      .sort({ date: -1 });

    res.json({
      success: true,
      data: attendance,
      count: attendance.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get team leaves (pending for approval)
// @route   GET /api/team/leaves
// @access  Private (L1, L2, L3)
export const getTeamLeaves = async (req, res) => {
  try {
    if (!req.user.canApproveLeaves && req.user.managementLevel === 0) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to view team leaves' 
      });
    }

    const { status } = req.query;
    const userLevel = req.user.managementLevel;
    let teamMemberIds = [];

    // Get team member IDs based on management level
    if (userLevel === 1) {
      // L1: Query ONLY direct reports (regardless of level)
      const directReports = await User.find({
        reportingManager: req.user.id,
        isActive: true
      }).select('_id');
      
      teamMemberIds = directReports.map(u => u._id);
    } else if (userLevel === 2) {
      // L2: ONLY direct reports (not downstream hierarchy)
      const directReports = await User.find({
        reportingManager: req.user.id,
        isActive: true
      }).select('_id');
      
      teamMemberIds = directReports.map(u => u._id);
    } else if (userLevel === 3) {
      // L3 (Admin): ONLY direct reports
      const directReports = await User.find({
        reportingManager: req.user.id,
        isActive: true
      }).select('_id');
      
      teamMemberIds = directReports.map(u => u._id);
    } else if (userLevel >= 4) {
      // L4 (CEO/Owner): ONLY direct reports
      const directReports = await User.find({
        reportingManager: req.user.id,
        isActive: true
      }).select('_id');
      
      teamMemberIds = directReports.map(u => u._id);
    }

    let query = {
      employee: { $in: teamMemberIds }
    };

    if (status) {
      query.status = status;
    }

    const leaves = await Leave.find(query)
      .populate('employee', 'firstName lastName employeeId profileImage managementLevel reportingManager')
      .populate('approvedBy', 'firstName lastName')
      .populate('currentApprover', 'firstName lastName')
      .populate('escalatedTo', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: leaves,
      count: leaves.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};// @desc    Bulk approve leaves
// @route   POST /api/team/leaves/bulk-approve
// @access  Private (L1, L2, L3)
export const bulkApproveLeaves = async (req, res) => {
  try {
    if (!req.user.canApproveLeaves && req.user.managementLevel === 0) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to approve leaves' 
      });
    }

    const { leaveIds, action, remarks } = req.body;

    if (!leaveIds || !Array.isArray(leaveIds) || leaveIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of leave IDs'
      });
    }

    if (!action || !['approved', 'rejected'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be either approved or rejected'
      });
    }

    const teamMemberIds = req.user.teamMembers.map(id => id.toString());
    const results = [];
    const errors = [];

    for (const leaveId of leaveIds) {
      try {
        const leave = await Leave.findById(leaveId).populate('employee');
        
        if (!leave) {
          errors.push({ leaveId, error: 'Leave not found' });
          continue;
        }

        // Check if this leave belongs to team member
        if (!teamMemberIds.includes(leave.employee._id.toString())) {
          errors.push({ leaveId, error: 'Not authorized to approve this leave' });
          continue;
        }

        if (leave.status !== 'pending') {
          errors.push({ leaveId, error: 'Leave already processed' });
          continue;
        }

        // Update leave
        leave.status = action;
        leave.approvedBy = req.user.id;
        leave.approvalDate = new Date();
        leave.remarks = remarks || `Bulk ${action} by ${req.user.firstName} ${req.user.lastName}`;
        
        // Add to approval history
        leave.approvalHistory.push({
          approver: req.user.id,
          action: action,
          date: new Date(),
          remarks: remarks,
          level: req.user.managementLevel
        });

        await leave.save();
        results.push({ leaveId, status: action, success: true });

        // TODO: Send notification to employee
      } catch (error) {
        errors.push({ leaveId, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `Bulk ${action} completed`,
      results,
      errors,
      processed: results.length,
      failed: errors.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get team performance report
// @route   GET /api/team/performance
// @access  Private (L1, L2, L3)
export const getTeamPerformance = async (req, res) => {
  try {
    if (!req.user.canManageAttendance && req.user.managementLevel === 0) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized' 
      });
    }

    const { month, year } = req.query;
    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    const startDate = new Date(currentYear, currentMonth - 1, 1);
    const endDate = new Date(currentYear, currentMonth, 0);
    const teamMemberIds = req.user.teamMembers;

    // Get team members
    const teamMembers = await User.find({
      _id: { $in: teamMemberIds }
    }).select('firstName lastName employeeId profileImage');

    // Get attendance for the month
    const attendance = await Attendance.find({
      employee: { $in: teamMemberIds },
      date: { $gte: startDate, $lte: endDate }
    });

    // Get leaves for the month
    const leaves = await Leave.find({
      employee: { $in: teamMemberIds },
      startDate: { $lte: endDate },
      endDate: { $gte: startDate }
    });

    // Calculate performance for each team member
    const performance = teamMembers.map(member => {
      const memberAttendance = attendance.filter(
        a => a.employee.toString() === member._id.toString()
      );
      
      const memberLeaves = leaves.filter(
        l => l.employee.toString() === member._id.toString()
      );

      const present = memberAttendance.filter(a => a.status === 'present').length;
      const absent = memberAttendance.filter(a => a.status === 'absent').length;
      const onLeave = memberAttendance.filter(a => a.status === 'on-leave' || a.status === 'half-day').length;
      
      const totalWorkingHours = memberAttendance.reduce((sum, a) => sum + (a.workingHours || 0), 0);
      const avgWorkingHours = memberAttendance.length > 0 
        ? (totalWorkingHours / memberAttendance.length).toFixed(2) 
        : 0;

      const workingDays = Math.floor((new Date() - startDate) / (1000 * 60 * 60 * 24)) + 1;
      const attendanceRate = workingDays > 0 
        ? ((present / workingDays) * 100).toFixed(1) 
        : 0;

      return {
        employee: {
          _id: member._id,
          name: `${member.firstName} ${member.lastName}`,
          employeeId: member.employeeId,
          profileImage: member.profileImage
        },
        stats: {
          present,
          absent,
          onLeave,
          totalDays: memberAttendance.length,
          totalWorkingHours,
          avgWorkingHours: parseFloat(avgWorkingHours),
          attendanceRate: parseFloat(attendanceRate),
          leavesTaken: memberLeaves.length,
          pendingLeaves: memberLeaves.filter(l => l.status === 'pending').length
        }
      };
    });

    // Sort by attendance rate
    performance.sort((a, b) => b.stats.attendanceRate - a.stats.attendanceRate);

    res.json({
      success: true,
      data: {
        month: currentMonth,
        year: currentYear,
        teamSize: teamMembers.length,
        performance
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all managers (for dropdown)
// @route   GET /api/team/managers
// @access  Private
export const getManagers = async (req, res) => {
  try {
    // Get all users who can be managers (L1+) OR users of same level as current user
    const currentUserLevel = req.user?.managementLevel || 0;
    
    // Fetch managers (L1+) and peers (same level)
    const managers = await User.find({
      $or: [
        { managementLevel: { $gte: 1 } }, // All L1+ users
        { managementLevel: currentUserLevel } // Users of same level (for peer reporting)
      ],
      isActive: true
    })
    .select('firstName lastName employeeId managementLevel position department')
    .populate('department', 'name')
    .sort({ managementLevel: -1, firstName: 1 });

    res.json({
      success: true,
      data: managers,
      count: managers.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get team calendar (leaves and attendance)
// @route   GET /api/team/calendar
// @access  Private (L1, L2, L3)
export const getTeamCalendar = async (req, res) => {
  try {
    if (!req.user.canManageAttendance && req.user.managementLevel === 0) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized' 
      });
    }

    const { month, year } = req.query;
    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    const startDate = new Date(currentYear, currentMonth - 1, 1);
    const endDate = new Date(currentYear, currentMonth, 0);
    const teamMemberIds = req.user.teamMembers;

    // Get team members
    const teamMembers = await User.find({
      _id: { $in: teamMemberIds }
    }).select('firstName lastName employeeId profileImage');

    // Get leaves for the month
    const leaves = await Leave.find({
      employee: { $in: teamMemberIds },
      startDate: { $lte: endDate },
      endDate: { $gte: startDate },
      status: { $in: ['pending', 'approved'] }
    }).populate('employee', 'firstName lastName employeeId profileImage');

    // Get attendance for the month
    const attendance = await Attendance.find({
      employee: { $in: teamMemberIds },
      date: { $gte: startDate, $lte: endDate }
    }).populate('employee', 'firstName lastName employeeId profileImage');

    // Format calendar data
    const calendarData = [];
    const daysInMonth = endDate.getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(currentYear, currentMonth - 1, day);
      const dateStr = currentDate.toISOString().split('T')[0];

      const dayData = {
        date: dateStr,
        day: currentDate.getDate(),
        dayOfWeek: currentDate.toLocaleDateString('en-US', { weekday: 'short' }),
        employees: []
      };

      teamMembers.forEach(member => {
        // Check attendance
        const att = attendance.find(a => 
          a.employee._id.toString() === member._id.toString() &&
          a.date.toISOString().split('T')[0] === dateStr
        );

        // Check leaves
        const leave = leaves.find(l => {
          const leaveStart = new Date(l.startDate).setHours(0, 0, 0, 0);
          const leaveEnd = new Date(l.endDate).setHours(0, 0, 0, 0);
          const current = currentDate.getTime();
          return l.employee._id.toString() === member._id.toString() &&
                 current >= leaveStart && current <= leaveEnd;
        });

        dayData.employees.push({
          _id: member._id,
          name: `${member.firstName} ${member.lastName}`,
          employeeId: member.employeeId,
          profileImage: member.profileImage,
          status: att ? att.status : 'not-marked',
          workingHours: att ? att.workingHours : 0,
          leave: leave ? {
            type: leave.leaveType,
            status: leave.status
          } : null
        });
      });

      calendarData.push(dayData);
    }

    res.json({
      success: true,
      data: {
        month: currentMonth,
        year: currentYear,
        calendar: calendarData
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
