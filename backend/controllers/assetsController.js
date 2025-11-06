import User from '../models/User.js';

// @desc    Get assets for current user or all employees (for admin)
// @route   GET /api/assets
// @access  Private
export const getAssets = async (req, res) => {
  try {
    const userLevel = req.user.managementLevel || 0;
    let query = {};

    // L0 (Employee): Only see own assets
    if (userLevel === 0) {
      query._id = req.user.id;
    }
    // L1 (Manager): See own + direct reports' assets
    else if (userLevel === 1) {
      const teamMemberIds = req.user.teamMembers || [];
      query._id = { $in: [req.user.id, ...teamMemberIds] };
    }
    // L2 (Senior Manager): See own + L1 + L0 under them
    else if (userLevel === 2) {
      const l1Managers = await User.find({ 
        reportingManager: req.user.id,
        managementLevel: 1 
      }).select('_id teamMembers');
      
      const l1ManagerIds = l1Managers.map(m => m._id);
      const l0EmployeeIds = l1Managers.flatMap(m => m.teamMembers || []);
      
      query._id = { $in: [req.user.id, ...l1ManagerIds, ...l0EmployeeIds] };
    }
    // L3 (Admin): See all employees
    // L4 (CEO/Owner): See all employees - FULL SYSTEM ACCESS
    // No filter needed for L3 and L4

    const users = await User.find(query)
      .select('employeeId firstName lastName email department position assets reportingManager managementLevel')
      .populate('department', 'name')
      .populate('assets.allocatedBy', 'firstName lastName')
      .populate('assets.revokedBy', 'firstName lastName')
      .populate('reportingManager', 'firstName lastName')
      .sort({ firstName: 1 });

    // Format the response to include only users with assets or all users for management
    const assetsData = users.map(user => ({
      _id: user._id,
      employeeId: user.employeeId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      department: user.department,
      position: user.position,
      reportingManager: user.reportingManager,
      managementLevel: user.managementLevel,
      assets: user.assets || [],
    }));

    res.status(200).json({
      success: true,
      count: assetsData.length,
      data: assetsData,
    });
  } catch (error) {
    console.error('Get assets error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add asset to employee
// @route   POST /api/assets/:employeeId
// @access  Private (Admin or Reporting Manager)
export const addAsset = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { assetName } = req.body;
    const userLevel = req.user.managementLevel || 0;

    if (!assetName || !assetName.trim()) {
      return res.status(400).json({ success: false, message: 'Asset name is required' });
    }

    // Get the target employee
    const employee = await User.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Check permissions: Admin (L3) or CEO (L4) or employee's reporting manager
    const canManage = userLevel >= 3 || 
                     (employee.reportingManager && employee.reportingManager.toString() === req.user.id);

    if (!canManage) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only add assets to employees who report to you or if you are an admin' 
      });
    }

    // Add the asset
    const newAsset = {
      name: assetName.trim(),
      allocatedDate: new Date(),
      allocatedBy: req.user.id,
      status: 'active',
    };

    employee.assets.push(newAsset);
    await employee.save();

    // Populate the response
    const updatedEmployee = await User.findById(employeeId)
      .select('employeeId firstName lastName assets')
      .populate('assets.allocatedBy', 'firstName lastName')
      .populate('assets.revokedBy', 'firstName lastName');

    res.status(200).json({
      success: true,
      message: 'Asset added successfully',
      data: updatedEmployee,
    });
  } catch (error) {
    console.error('Add asset error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Revoke asset from employee
// @route   PUT /api/assets/:employeeId/:assetId/revoke
// @access  Private (Admin or Reporting Manager)
export const revokeAsset = async (req, res) => {
  try {
    const { employeeId, assetId } = req.params;
    const userLevel = req.user.managementLevel || 0;

    // Get the target employee
    const employee = await User.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Check permissions: Admin (L3) or CEO (L4) or employee's reporting manager
    const canManage = userLevel >= 3 || 
                     (employee.reportingManager && employee.reportingManager.toString() === req.user.id);

    if (!canManage) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only revoke assets from employees who report to you or if you are an admin' 
      });
    }

    // Find and revoke the asset
    const asset = employee.assets.id(assetId);
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    if (asset.status === 'revoked') {
      return res.status(400).json({ success: false, message: 'Asset is already revoked' });
    }

    asset.status = 'revoked';
    asset.revokedDate = new Date();
    asset.revokedBy = req.user.id;

    await employee.save();

    // Populate the response
    const updatedEmployee = await User.findById(employeeId)
      .select('employeeId firstName lastName assets')
      .populate('assets.allocatedBy', 'firstName lastName')
      .populate('assets.revokedBy', 'firstName lastName');

    res.status(200).json({
      success: true,
      message: 'Asset revoked successfully',
      data: updatedEmployee,
    });
  } catch (error) {
    console.error('Revoke asset error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
