import Resignation from '../models/Resignation.js';
import User from '../models/User.js';

// @desc    Submit resignation
// @route   POST /api/resignations
// @access  Private
export const submitResignation = async (req, res) => {
  try {
    const { lastWorkingDate, reason } = req.body;

    // Check if user already has pending resignation
    const existingResignation = await Resignation.findOne({
      employee: req.user.id,
      status: { $in: ['pending', 'approved'] }
    });

    if (existingResignation) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending resignation request'
      });
    }

    const resignation = await Resignation.create({
      employee: req.user.id,
      lastWorkingDate,
      reason,
    });

    const populatedResignation = await Resignation.findById(resignation._id)
      .populate({
        path: 'employee',
        select: 'firstName lastName employeeId email department position',
        populate: { path: 'department', select: 'name' }
      });

    res.status(201).json({
      success: true,
      data: populatedResignation,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all resignations
// @route   GET /api/resignations
// @access  Private
export const getResignations = async (req, res) => {
  try {
    const userLevel = req.user.managementLevel || 0;
    let query = {};

    // L0-L2: Can only view their own resignation
    if (userLevel < 3) {
      query.employee = req.user.id;
    }
    // L3-L4: Can view all resignations

    const resignations = await Resignation.find(query)
      .populate({
        path: 'employee',
        select: 'firstName lastName employeeId email department position managementLevel',
        populate: { path: 'department', select: 'name' }
      })
      .populate('approvedBy', 'firstName lastName employeeId')
      .populate('exitProcedures.assetReturn.completedBy', 'firstName lastName')
      .populate('exitProcedures.exitInterview.completedBy', 'firstName lastName')
      .populate('exitProcedures.knowledgeTransfer.completedBy', 'firstName lastName')
      .populate('exitProcedures.clearance.completedBy', 'firstName lastName')
      .populate('exitProcedures.finalSettlement.completedBy', 'firstName lastName')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: resignations.length,
      data: resignations,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single resignation
// @route   GET /api/resignations/:id
// @access  Private
export const getResignation = async (req, res) => {
  try {
    const resignation = await Resignation.findById(req.params.id)
      .populate({
        path: 'employee',
        select: 'firstName lastName employeeId email department position',
        populate: { path: 'department', select: 'name' }
      })
      .populate('approvedBy', 'firstName lastName employeeId')
      .populate('exitProcedures.assetReturn.completedBy', 'firstName lastName')
      .populate('exitProcedures.exitInterview.completedBy', 'firstName lastName')
      .populate('exitProcedures.knowledgeTransfer.completedBy', 'firstName lastName')
      .populate('exitProcedures.clearance.completedBy', 'firstName lastName')
      .populate('exitProcedures.finalSettlement.completedBy', 'firstName lastName');

    if (!resignation) {
      return res.status(404).json({
        success: false,
        message: 'Resignation not found',
      });
    }

    // Check permissions
    const userLevel = req.user.managementLevel || 0;
    if (userLevel < 3 && resignation.employee._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this resignation',
      });
    }

    res.status(200).json({
      success: true,
      data: resignation,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Approve/Reject resignation
// @route   PATCH /api/resignations/:id/status
// @access  Private (L3-L4, but L3 can only approve L0-L2, L4 can approve all)
export const updateResignationStatus = async (req, res) => {
  try {
    const userLevel = req.user.managementLevel || 0;
    
    if (userLevel < 3) {
      return res.status(403).json({
        success: false,
        message: 'Only L3 (Admin) and L4 (CEO/Owner) can approve resignations',
      });
    }

    const { status, remarks } = req.body;

    const resignation = await Resignation.findById(req.params.id)
      .populate('employee', 'firstName lastName employeeId email managementLevel');

    if (!resignation) {
      return res.status(404).json({
        success: false,
        message: 'Resignation not found',
      });
    }

    if (resignation.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'This resignation has already been processed',
      });
    }

    // Check if L3 is trying to approve L3 resignation - only L4 can do that
    if (userLevel === 3 && resignation.employee.managementLevel >= 3) {
      return res.status(403).json({
        success: false,
        message: 'Only L4 (CEO/Owner) can approve L3 resignations',
      });
    }

    resignation.status = status;
    resignation.approvedBy = req.user.id;
    resignation.approvalDate = Date.now();
    resignation.approvalRemarks = remarks;

    // If rejected, mark employee as active again
    if (status === 'rejected') {
      await User.findByIdAndUpdate(resignation.employee._id, {
        status: 'active',
      });
    }

    await resignation.save();

    const updatedResignation = await Resignation.findById(resignation._id)
      .populate('employee', 'firstName lastName employeeId email')
      .populate('approvedBy', 'firstName lastName employeeId');

    res.status(200).json({
      success: true,
      data: updatedResignation,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update exit procedure
// @route   PATCH /api/resignations/:id/exit-procedure
// @access  Private (L3-L4, but L3 can only manage L0-L2, L4 can manage all)
export const updateExitProcedure = async (req, res) => {
  try {
    const userLevel = req.user.managementLevel || 0;
    
    if (userLevel < 3) {
      return res.status(403).json({
        success: false,
        message: 'Only L3 (Admin) and L4 (CEO/Owner) can update exit procedures',
      });
    }

    const { procedureType, status, remarks } = req.body;

    const resignation = await Resignation.findById(req.params.id)
      .populate('employee', 'managementLevel');

    if (!resignation) {
      return res.status(404).json({
        success: false,
        message: 'Resignation not found',
      });
    }

    // Check if L3 is trying to manage L3 exit procedures - only L4 can do that
    if (userLevel === 3 && resignation.employee.managementLevel >= 3) {
      return res.status(403).json({
        success: false,
        message: 'Only L4 (CEO/Owner) can manage L3 exit procedures',
      });
    }

    if (!resignation.exitProcedures[procedureType]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid procedure type',
      });
    }

    resignation.exitProcedures[procedureType].status = status;
    resignation.exitProcedures[procedureType].completedBy = req.user.id;
    resignation.exitProcedures[procedureType].completedDate = Date.now();
    resignation.exitProcedures[procedureType].remarks = remarks;

    // Check if all procedures are completed
    const allCompleted = Object.values(resignation.exitProcedures).every(
      proc => proc.status === 'completed'
    );

    if (allCompleted && resignation.status === 'approved') {
      resignation.status = 'completed';
      // Update employee status to inactive
      await User.findByIdAndUpdate(resignation.employee, {
        status: 'inactive',
        isActive: false,
      });
    }

    await resignation.save();

    const updatedResignation = await Resignation.findById(resignation._id)
      .populate('employee', 'firstName lastName employeeId email')
      .populate('exitProcedures.assetReturn.completedBy', 'firstName lastName')
      .populate('exitProcedures.exitInterview.completedBy', 'firstName lastName')
      .populate('exitProcedures.knowledgeTransfer.completedBy', 'firstName lastName')
      .populate('exitProcedures.clearance.completedBy', 'firstName lastName')
      .populate('exitProcedures.finalSettlement.completedBy', 'firstName lastName');

    res.status(200).json({
      success: true,
      data: updatedResignation,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
