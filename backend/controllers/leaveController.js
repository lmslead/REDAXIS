import Leave from '../models/Leave.js';
import Attendance from '../models/Attendance.js';
import User from '../models/User.js';

// Helper function to check if an employee is in the manager's reporting chain
const isEmployeeInReportingChain = async (managerId, employeeId) => {
  try {
    const employee = await User.findById(employeeId).select('reportingManager');
    if (!employee) return false;
    
    // Check direct report
    if (employee.reportingManager && employee.reportingManager.toString() === managerId) {
      return true;
    }
    
    // Check indirect reports (recursive)
    if (employee.reportingManager) {
      return await isEmployeeInReportingChain(managerId, employee.reportingManager);
    }
    
    return false;
  } catch (error) {
    console.error('Error checking reporting chain:', error);
    return false;
  }
};

// Helper function to sync approved leave to attendance system
const syncLeaveToAttendance = async (leave) => {
  try {
    const startDate = new Date(leave.startDate);
    const endDate = new Date(leave.endDate);
    
    // Normalize dates to start of day
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    
    const attendanceRecords = [];
    const currentDate = new Date(startDate);
    
    // Generate attendance records for each day in the leave period
    while (currentDate <= endDate) {
      const dateToCreate = new Date(currentDate);
      
      // Try to find existing attendance record
      const existingAttendance = await Attendance.findOne({
        employee: leave.employee,
        date: dateToCreate
      });
      
      if (existingAttendance) {
        // Update existing record - use 'half-day' status for half-day leaves, 'on-leave' for others
        existingAttendance.status = leave.leaveType === 'half-day' ? 'half-day' : 'on-leave';
        existingAttendance.notes = `${leave.leaveType.charAt(0).toUpperCase() + leave.leaveType.slice(1)} Leave`;
        existingAttendance.source = 'leave';
        existingAttendance.deviceSyncMeta = undefined;
        await existingAttendance.save();
        attendanceRecords.push(existingAttendance);
      } else {
        // Create new attendance record - use 'half-day' status for half-day leaves, 'on-leave' for others
        const attendanceData = {
          employee: leave.employee,
          date: dateToCreate,
          status: leave.leaveType === 'half-day' ? 'half-day' : 'on-leave',
          notes: `${leave.leaveType.charAt(0).toUpperCase() + leave.leaveType.slice(1)} Leave`,
          workingHours: leave.leaveType === 'half-day' ? 4 : 0,
          source: 'leave'
        };
        
        const attendance = await Attendance.create(attendanceData);
        attendanceRecords.push(attendance);
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log(`✅ Synced ${attendanceRecords.length} days to attendance for leave ${leave._id}`);
    return attendanceRecords;
  } catch (error) {
    console.error('❌ Error syncing leave to attendance:', error);
    throw error;
  }
};

// Helper function to remove leave from attendance when rejected
const removeLeaveFromAttendance = async (leave) => {
  try {
    const startDate = new Date(leave.startDate);
    const endDate = new Date(leave.endDate);
    
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    
    // Find and delete attendance records that were created for this leave (both on-leave and half-day)
    const result = await Attendance.deleteMany({
      employee: leave.employee,
      date: { $gte: startDate, $lte: endDate },
      status: { $in: ['on-leave', 'half-day'] },
      $or: [
        { source: 'leave' },
        { source: { $exists: false } }
      ]
    });
    
    console.log(`✅ Removed ${result.deletedCount} leave attendance records for leave ${leave._id}`);
    return result;
  } catch (error) {
    console.error('❌ Error removing leave from attendance:', error);
    throw error;
  }
};

export const getLeaves = async (req, res) => {
  try {
    const { employeeId, status } = req.query;
    let query = {};

    // === FILTER BY MANAGEMENT LEVEL ===
    const userLevel = req.user.managementLevel || 0;
    
    // L0 (Employee): Only see own leaves
    if (userLevel === 0) {
      query.employee = req.user.id;
    }
    // L1 (Manager): See own leaves + direct L0 reports
    else if (userLevel === 1) {
      // Query direct L0 reports from database
      const directReports = await User.find({
        reportingManager: req.user.id,
        managementLevel: 0,
        isActive: true
      }).select('_id');
      
      const teamMemberIds = directReports.map(u => u._id);
      query.employee = { $in: [req.user.id, ...teamMemberIds] };
    }
    // L2 (Senior Manager): See own leaves + L1 managers + their L0 reports
    else if (userLevel === 2) {
      // Get all L1 managers reporting to this L2
      const l1Managers = await User.find({ 
        reportingManager: req.user.id,
        managementLevel: 1,
        isActive: true
      }).select('_id');
      
      const l1ManagerIds = l1Managers.map(m => m._id);
      
      // Get all L0 employees under those L1 managers (query database directly)
      const l0Employees = await User.find({
        reportingManager: { $in: l1ManagerIds },
        managementLevel: 0,
        isActive: true
      }).select('_id');
      
      const l0EmployeeIds = l0Employees.map(e => e._id);
      
      query.employee = { $in: [req.user.id, ...l1ManagerIds, ...l0EmployeeIds] };
    }
    // L3 (Admin): See all leaves (no filter)
    else if (userLevel === 3) {
      // No employee filter - see all
    }

    // Apply additional filters
    if (employeeId && userLevel === 3) {
      query.employee = employeeId; // L3 can filter by specific employee
    }
    if (status) {
      query.status = status;
    }

    const leaves = await Leave.find(query)
      .populate('employee', 'firstName lastName employeeId managementLevel reportingManager')
      .populate('approvedBy', 'firstName lastName employeeId')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: leaves.length, data: leaves });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createLeave = async (req, res) => {
  try {
    req.body.employee = req.user.id;
    const leave = await Leave.create(req.body);
    res.status(201).json({ success: true, data: leave });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateLeaveStatus = async (req, res) => {
  try {
    const { status, remarks } = req.body;
    const leave = await Leave.findById(req.params.id)
      .populate('employee', 'firstName lastName reportingManager managementLevel')
      .populate('currentApprover', 'firstName lastName managementLevel');

    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave not found' });
    }

    // === NEW HIERARCHY: MANAGEMENT LEVEL BASED APPROVAL ===
    
    const userLevel = req.user.managementLevel || 0;
    const employeeLevel = leave.employee.managementLevel || 0;
    
    // Check if user can approve leaves
    if (!req.user.canApproveLeaves) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to approve leaves' 
      });
    }

    // Check if user is trying to approve their own leave
    if (leave.employee._id.toString() === req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'You cannot approve your own leave' 
      });
    }

    // L4 (CEO/Owner) leaves can ONLY be approved by other L4 users
    if (employeeLevel >= 4 && userLevel < 4) {
      return res.status(403).json({ 
        success: false, 
        message: 'Only L4 (CEO/Owner) level users can approve L4 level leaves' 
      });
    }

    // Level 4 (CEO/Owner) can approve any leave (including other L4 leaves)
    if (userLevel >= 4) {
      // L4 can approve anything
    }
    // Level 3 (Admin) can approve L0-L2 leaves, but NOT L3 or L4 leaves
    else if (userLevel === 3) {
      if (employeeLevel >= 4) {
        return res.status(403).json({ 
          success: false, 
          message: 'L3 (Admin) cannot approve L4 (CEO/Owner) level leaves. Only L4 can approve L4 leaves.' 
        });
      }
      if (employeeLevel >= 3) {
        return res.status(403).json({ 
          success: false, 
          message: 'L3 (Admin) cannot approve L3 level leaves. Only L4 (CEO/Owner) can approve L3 leaves.' 
        });
      }
      // Admin can approve L0-L2 only
    }
    // Level 2 (Senior Manager) can approve L0, L1, and L2 peer leaves
    else if (userLevel === 2) {
      // Allow L2 to approve other L2 peers (same level reporting)
      if (employeeLevel === 2) {
        // Check if employee reports to this L2 manager (peer approval)
        if (leave.employee.reportingManager.toString() !== req.user.id) {
          return res.status(403).json({ 
            success: false, 
            message: 'You can only approve leaves for employees in your reporting chain or peers who report to you' 
          });
        }
      }
      // Allow L2 to approve L0 and L1 in reporting chain
      else if (employeeLevel < 2) {
        // Check if employee is in reporting chain
        const isInChain = await isEmployeeInReportingChain(req.user.id, leave.employee._id);
        if (!isInChain) {
          return res.status(403).json({ 
            success: false, 
            message: 'You can only approve leaves for employees in your reporting chain' 
          });
        }
      }
      // L2 cannot approve L3/L4
      else {
        return res.status(403).json({ 
          success: false, 
          message: 'Level 2 managers can only approve leaves for Level 0, Level 1 employees, and Level 2 peers' 
        });
      }
    }
    // Level 1 (RM) can approve L0 direct reports OR L1 peers
    else if (userLevel === 1) {
      // Allow L1 to approve other L1 peers (same level reporting)
      if (employeeLevel === 1) {
        // Check if employee reports to this L1 manager (peer approval)
        if (leave.employee.reportingManager.toString() !== req.user.id) {
          return res.status(403).json({ 
            success: false, 
            message: 'You can only approve leaves for your direct reports or peers who report to you' 
          });
        }
      }
      // Allow L1 to approve L0 direct reports
      else if (employeeLevel === 0) {
        // Check if employee reports directly to this RM
        if (leave.employee.reportingManager.toString() !== req.user.id) {
          return res.status(403).json({ 
            success: false, 
            message: 'You can only approve leaves for your direct reports' 
          });
        }
      }
      // L1 cannot approve L2/L3/L4
      else {
        return res.status(403).json({ 
          success: false, 
          message: 'Level 1 managers can only approve leaves for Level 0 employees and Level 1 peers' 
        });
      }
    }
    // Level 0 (Employee) can approve L0 peer leaves if they have canApproveLeaves permission
    else if (userLevel === 0) {
      // L0 can only approve other L0 peers who report to them
      if (employeeLevel === 0) {
        // Check if employee reports to this L0 user (peer approval)
        if (leave.employee.reportingManager.toString() !== req.user.id) {
          return res.status(403).json({ 
            success: false, 
            message: 'You can only approve leaves for L0 peers who report to you' 
          });
        }
      } else {
        return res.status(403).json({ 
          success: false, 
          message: 'Level 0 employees can only approve leaves for Level 0 peers' 
        });
      }
    }

    // Update leave status
    leave.status = status;
    leave.remarks = remarks;
    leave.approvedBy = req.user.id;
    leave.approvalDate = new Date();
    
    // Add to approval history
    leave.approvalHistory.push({
      approver: req.user.id,
      action: status,
      date: new Date(),
      remarks: remarks,
      level: req.user.managementLevel || 3 // Admin=3, HR=3, RM=1/2
    });

    // Reset escalation if approved/rejected
    if (status === 'approved' || status === 'rejected') {
      leave.isEscalated = false;
      leave.escalationDate = null;
      leave.escalatedTo = null;
    }

    await leave.save();

    // Sync with attendance system
    if (status === 'approved') {
      console.log(`📅 Syncing approved leave to attendance system...`);
      await syncLeaveToAttendance(leave);
    } else if (status === 'rejected') {
      console.log(`🗑️ Removing rejected leave from attendance system...`);
      await removeLeaveFromAttendance(leave);
    }

    // Populate all references before sending response
    await leave.populate([
      { path: 'approvedBy', select: 'firstName lastName employeeId' },
      { path: 'employee', select: 'firstName lastName employeeId' },
      { path: 'currentApprover', select: 'firstName lastName employeeId' },
      { path: 'escalatedTo', select: 'firstName lastName employeeId' }
    ]);

    res.status(200).json({ success: true, data: leave });
  } catch (error) {
    console.error('❌ Error updating leave status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteLeave = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave not found' });
    }

    // Allow employee to cancel their own pending leave OR Level 3/4 admin
    const isOwnLeave = leave.employee.toString() === req.user.id;
    const isAdmin = req.user.managementLevel >= 3; // L3 or L4
    
    if (!isOwnLeave && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this leave' });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending leaves can be cancelled' });
    }

    await Leave.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: 'Leave cancelled successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Sync all approved leaves to attendance system (useful for initial setup or data migration)
export const syncAllApprovedLeaves = async (req, res) => {
  try {
    console.log('🔄 Starting to sync all approved leaves to attendance...');
    
    // Find all approved leaves
    const approvedLeaves = await Leave.find({ status: 'approved' });
    
    console.log(`Found ${approvedLeaves.length} approved leaves to sync`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const leave of approvedLeaves) {
      try {
        await syncLeaveToAttendance(leave);
        successCount++;
      } catch (error) {
        console.error(`Error syncing leave ${leave._id}:`, error);
        errorCount++;
      }
    }
    
    res.status(200).json({ 
      success: true, 
      message: `Synced ${successCount} approved leaves to attendance system`,
      successCount,
      errorCount,
      total: approvedLeaves.length
    });
  } catch (error) {
    console.error('❌ Error syncing approved leaves:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
