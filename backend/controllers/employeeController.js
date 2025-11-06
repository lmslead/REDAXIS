import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import Department from '../models/Department.js';

// Helper function to check if user can view/edit sensitive data
// Only Finance Department users at L3 or L4 level can access sensitive data
const checkCanViewSensitiveData = async (user) => {
  if (!user) return false;
  
  const userLevel = user.managementLevel || 0;
  
  // L4 (CEO) has full access
  if (userLevel === 4) return true;
  
  // L3 must be in Finance department
  if (userLevel === 3) {
    const userWithDept = await User.findById(user.id).populate('department');
    return userWithDept?.department?.name === 'Finance';
  }
  
  return false;
};

// @desc    Get all employees
// @route   GET /api/employees
// @access  Private
export const getEmployees = async (req, res) => {
  try {
    const { status, department, role, search } = req.query;
    const userLevel = req.user.managementLevel || 0;
    
    let query = {};

    // === FILTER BY MANAGEMENT LEVEL WITH PEER ACCESS ===
    // L0 (Employee): Can view own profile + direct reports + peers (same level with same manager)
    if (userLevel === 0) {
      // Get direct reports
      const directReports = await User.find({ reportingManager: req.user.id }).select('_id');
      const directReportIds = directReports.map(emp => emp._id);
      
      // Get peers (same level, same reporting manager)
      const peers = await User.find({ 
        reportingManager: req.user.reportingManager,
        managementLevel: userLevel,
        _id: { $ne: req.user.id } // Exclude self
      }).select('_id');
      const peerIds = peers.map(emp => emp._id);
      
      query._id = { $in: [req.user.id, ...directReportIds, ...peerIds] };
      console.log('🔒 L0 Employee: Viewing own profile + peers + direct reports');
    }
    // L1 (Manager): Can view own profile + direct reports + peers
    else if (userLevel === 1) {
      // Find employees who report directly to this L1 manager
      const directReports = await User.find({ reportingManager: req.user.id }).select('_id');
      const directReportIds = directReports.map(emp => emp._id);
      
      // Get peers (other L1 managers with same reporting manager)
      const peers = await User.find({ 
        reportingManager: req.user.reportingManager,
        managementLevel: userLevel,
        _id: { $ne: req.user.id }
      }).select('_id');
      const peerIds = peers.map(emp => emp._id);
      
      query._id = { $in: [req.user.id, ...directReportIds, ...peerIds] };
      console.log('👔 L1 Manager: Can view', directReportIds.length, 'direct reports +', peerIds.length, 'peers');
    }
    // L2 (Senior Manager): Can view ALL direct reports (any level) + their downstream + peers
    else if (userLevel === 2) {
      // Get ALL direct reports (any level - L0, L1, or even L2 peers)
      const allDirectReports = await User.find({ 
        reportingManager: req.user.id
      }).select('_id managementLevel teamMembers');
      
      const directReportIds = allDirectReports.map(m => m._id);
      
      // Get L1 managers from direct reports
      const l1Managers = allDirectReports.filter(u => u.managementLevel === 1);
      const l0EmployeeIds = l1Managers.flatMap(m => m.teamMembers || []);
      
      // Get peers (other L2 managers with same reporting manager)
      const peers = await User.find({ 
        reportingManager: req.user.reportingManager,
        managementLevel: userLevel,
        _id: { $ne: req.user.id }
      }).select('_id');
      const peerIds = peers.map(emp => emp._id);
      
      // L2 can see themselves, ALL direct reports (any level), downstream employees, and peers
      query._id = { $in: [req.user.id, ...directReportIds, ...l0EmployeeIds, ...peerIds] };
      console.log('🎯 L2 Senior Manager: Can view', directReportIds.length, 'direct reports (all levels), their teams +', peerIds.length, 'peers');
    }
    // L3 (Admin): Can view ALL employees
    else if (userLevel === 3) {
      // No filter - admin sees everyone
      console.log('👑 L3 Admin: Full access to all employees');
    }
    // L4 (CEO/Owner): Can view ALL employees - FULL SYSTEM ACCESS
    else if (userLevel === 4) {
      // No filter - CEO sees everyone
      console.log('👑 L4 CEO/Owner: Full system access to all employees');
    }

    // Apply additional filters
    if (status) query.status = status;
    if (department) query.department = department;
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
      ];
    }

    const employees = await User.find(query)
      .select('-password')
      .populate('department')
      .populate('reportingManager', 'firstName lastName employeeId')
      .sort({ createdAt: -1 });

    // Filter sensitive fields based on user permissions
    const canViewSensitiveData = await checkCanViewSensitiveData(req.user);
    
    const filteredEmployees = employees.map(employee => {
      const empObj = employee.toObject();
      
      if (!canViewSensitiveData) {
        // Remove sensitive financial and personal data
        delete empObj.salary;
        delete empObj.bankDetails;
        delete empObj.complianceDetails;
        delete empObj.panCard;
        delete empObj.aadharCard;
      }
      
      return empObj;
    });

    console.log('✅ Employees Found:', filteredEmployees.length, 'records for L' + userLevel);

    res.status(200).json({
      success: true,
      count: filteredEmployees.length,
      data: filteredEmployees,
      canViewSensitiveData, // Send permission flag to frontend
    });
  } catch (error) {
    console.error('❌ Get employees error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single employee
// @route   GET /api/employees/:id
// @access  Private
export const getEmployee = async (req, res) => {
  try {
    const employee = await User.findById(req.params.id)
      .select('-password')
      .populate('department')
      .populate('reportingManager', 'firstName lastName employeeId');

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    
    // Check if user can view sensitive data
    // Only Finance Department L3/L4 can view sensitive data after creation
    const canViewSensitiveData = await checkCanViewSensitiveData(req.user);
    
    const empObj = employee.toObject();
    
    if (!canViewSensitiveData) {
      // Remove sensitive financial and identity data
      delete empObj.salary;
      delete empObj.bankDetails;
      delete empObj.complianceDetails;
      delete empObj.panCard;
      delete empObj.aadharCard;
    }

    res.status(200).json({
      success: true,
      data: empObj,
      canViewSensitiveData, // Send permission flag to frontend
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create employee
// @route   POST /api/employees
// @access  Private (L2, L3, and L4)
export const createEmployee = async (req, res) => {
  try {
    const userLevel = req.user.managementLevel || 0;
    
    // Only L2, L3, and L4 can create employees
    if (userLevel < 2) {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to create employees. Only L2 (Senior Manager), L3 (Admin), and L4 (CEO) can create employees.' 
      });
    }
    
    // L2 can only create L0 and L1 employees
    const newEmployeeLevel = req.body.managementLevel || 0;
    if (userLevel === 2 && newEmployeeLevel >= 2) {
      return res.status(403).json({ 
        success: false, 
        message: 'L2 Senior Managers can only create L0 (Employee) and L1 (Manager) level users.' 
      });
    }
    
    // L3 can create up to L2 (cannot create L3 or L4)
    if (userLevel === 3 && newEmployeeLevel >= 3) {
      return res.status(403).json({ 
        success: false, 
        message: 'L3 Admins can only create up to L2 (Senior Manager) level users.' 
      });
    }
    
    // L4 can create anyone (no restrictions)
    
    console.log(`✨ L${userLevel} creating new employee with level L${newEmployeeLevel}`);
    
    // During creation, all users with L2+ can add sensitive data
    // But after creation, only Finance L3/L4 can edit it
    // Log if sensitive data is being added
    const hasSensitiveData = req.body.salary || req.body.bankDetails || 
                            req.body.complianceDetails || req.body.panCard || 
                            req.body.aadharCard;
    
    if (hasSensitiveData) {
      console.log('💼 Employee created with sensitive data (onboarding)');
    }
    
    const employee = await User.create(req.body);

    res.status(201).json({
      success: true,
      data: employee,
    });
  } catch (error) {
    console.error('❌ Create employee error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update employee
// @route   PUT /api/employees/:id
// @access  Private (L2, L3, and L4)
export const updateEmployee = async (req, res) => {
  try {
    const userLevel = req.user.managementLevel || 0;
    const targetEmployeeId = req.params.id;
    
    // Check if user has permission to update
    // L0 and L1 cannot update employee records
    if (userLevel < 2) {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to update employee records. Only L2 (Senior Manager), L3 (Admin), and L4 (CEO) can update employees.' 
      });
    }
    
    // Get target employee to check their level
    const targetEmployee = await User.findById(targetEmployeeId);
    if (!targetEmployee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    
    const targetLevel = targetEmployee.managementLevel || 0;
    
    // L2 can only update L0 and L1 employees under them
    if (userLevel === 2) {
      // Check if target employee is in their hierarchy
      if (targetLevel >= 2) {
        return res.status(403).json({ 
          success: false, 
          message: 'L2 Senior Managers cannot update L2, L3, or L4 level employees.' 
        });
      }
      
      // Verify the employee is under their management
      const l1Managers = await User.find({ 
        reportingManager: req.user.id,
        managementLevel: 1 
      }).select('_id teamMembers');
      
      const l1ManagerIds = l1Managers.map(m => m._id.toString());
      const l0EmployeeIds = l1Managers.flatMap(m => (m.teamMembers || []).map(id => id.toString()));
      const allowedIds = [...l1ManagerIds, ...l0EmployeeIds];
      
      if (!allowedIds.includes(targetEmployeeId)) {
        return res.status(403).json({ 
          success: false, 
          message: 'You can only update employees in your management hierarchy.' 
        });
      }
    }
    
    // L3 can update anyone except L4
    if (userLevel === 3 && targetLevel >= 4) {
      return res.status(403).json({ 
        success: false, 
        message: 'L3 Admins cannot update L4 (CEO) level employees.' 
      });
    }
    
    // L4 can update anyone (no restrictions)
    
    console.log(`✏️ L${userLevel} updating employee:`, targetEmployeeId);
    
    // Check if user can edit sensitive data
    const canEditSensitiveData = await checkCanViewSensitiveData(req.user);
    
    // Remove password from update if it's empty
    const updateData = { ...req.body };
    
    // Restrict sensitive data updates to Finance L3/L4 only
    if (!canEditSensitiveData) {
      // Remove sensitive fields from update data
      delete updateData.salary;
      delete updateData.bankDetails;
      delete updateData.complianceDetails;
      delete updateData.panCard;
      delete updateData.aadharCard;
      
      console.log('🔒 Non-Finance user: Sensitive fields blocked from update');
    }
    
    if (!updateData.password || updateData.password.trim() === '') {
      delete updateData.password;
    } else {
      // Hash the password before updating (findByIdAndUpdate bypasses pre-save middleware)
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(updateData.password, salt);
    }

    const employee = await User.findByIdAndUpdate(targetEmployeeId, updateData, {
      new: true,
      runValidators: true,
    }).select('-password');

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    res.status(200).json({
      success: true,
      data: employee,
    });
  } catch (error) {
    console.error('❌ Update employee error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete employee
// @route   DELETE /api/employees/:id
// @access  Private (L3 and L4 only)
export const deleteEmployee = async (req, res) => {
  try {
    const userLevel = req.user.managementLevel || 0;
    
    // Only L3 and L4 can delete employees
    if (userLevel < 3) {
      return res.status(403).json({ 
        success: false, 
        message: 'Only L3 (Admin) and L4 (CEO) can delete employees.' 
      });
    }
    
    const employee = await User.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    
    // L3 cannot delete L4
    if (userLevel === 3 && employee.managementLevel >= 4) {
      return res.status(403).json({ 
        success: false, 
        message: 'L3 Admins cannot delete L4 (CEO) level employees.' 
      });
    }

    console.log(`🗑️ L${userLevel} deleting employee:`, req.params.id);
    
    await employee.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Employee deleted successfully',
    });
  } catch (error) {
    console.error('❌ Delete employee error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get employee statistics
// @route   GET /api/employees/stats
// @access  Private (Admin/HR)
export const getEmployeeStats = async (req, res) => {
  try {
    const total = await User.countDocuments();
    const active = await User.countDocuments({ status: 'active' });
    const inactive = await User.countDocuments({ status: 'inactive' });
    const onLeave = await User.countDocuments({ status: 'on-leave' });

    const byDepartment = await User.aggregate([
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 },
        },
      },
    ]);

    const byRole = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        total,
        active,
        inactive,
        onLeave,
        byDepartment,
        byRole,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update employee status (activate, inactivate, suspend)
// @route   PATCH /api/employees/:id/status
// @access  Private (L3 and L4 only, with level restrictions)
export const updateEmployeeStatus = async (req, res) => {
  try {
    const userLevel = req.user.managementLevel || 0;
    
    // Only L3 and L4 can manage user status
    if (userLevel < 3) {
      return res.status(403).json({
        success: false,
        message: 'Only L3 (Admin) and L4 (CEO/Owner) can manage employee status',
      });
    }

    const { status, isActive, reason } = req.body;

    // Validate status
    if (!['active', 'inactive', 'on-leave'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be active, inactive, or on-leave',
      });
    }

    const employee = await User.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    // Check if L3 is trying to manage L3 or L4 user - only L4 can do that
    if (userLevel === 3 && employee.managementLevel >= 3) {
      return res.status(403).json({
        success: false,
        message: 'Only L4 (CEO/Owner) can manage L3 and L4 user status',
      });
    }

    // Prevent users from inactivating themselves
    if (employee._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot change your own status',
      });
    }

    // Update employee status
    employee.status = status;
    if (typeof isActive !== 'undefined') {
      employee.isActive = isActive;
    }

    // If inactivating, set isActive to false
    if (status === 'inactive') {
      employee.isActive = false;
    }
    // If activating, set isActive to true
    else if (status === 'active') {
      employee.isActive = true;
    }

    await employee.save();

    // Log the action
    console.log(`✅ User ${req.user.employeeId} (L${userLevel}) changed status of ${employee.employeeId} (L${employee.managementLevel}) to ${status}. Reason: ${reason || 'N/A'}`);

    const updatedEmployee = await User.findById(employee._id)
      .select('-password')
      .populate('department')
      .populate('reportingManager', 'firstName lastName employeeId');

    res.status(200).json({
      success: true,
      message: `Employee status updated to ${status}`,
      data: updatedEmployee,
    });
  } catch (error) {
    console.error('❌ Update employee status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
