import Resignation from '../models/Resignation.js';
import User from '../models/User.js';

const VALID_DATE_FIELDS = ['lastWorkingDate', 'resignationDate'];

const parseInteger = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const buildDateRange = (query) => {
  const month = parseInteger(query.month);
  const quarter = parseInteger(query.quarter);
  const year = parseInteger(query.year);
  const hasCustomDates = Boolean(query.startDate || query.endDate);

  const throwValidationError = (message) => {
    const error = new Error(message);
    error.statusCode = 400;
    throw error;
  };

  if (month !== null) {
    if (month < 1 || month > 12) {
      throwValidationError('Month must be between 1 and 12');
    }
    const targetYear = year ?? new Date().getFullYear();
    if (targetYear < 1970 || targetYear > 3000) {
      throwValidationError('Year is out of supported range');
    }
    const start = new Date(Date.UTC(targetYear, month - 1, 1));
    const end = new Date(Date.UTC(targetYear, month, 0, 23, 59, 59, 999));
    return { start, end };
  }

  if (quarter !== null) {
    if (quarter < 1 || quarter > 4) {
      throwValidationError('Quarter must be between 1 and 4');
    }
    const targetYear = year ?? new Date().getFullYear();
    if (targetYear < 1970 || targetYear > 3000) {
      throwValidationError('Year is out of supported range');
    }
    const startMonth = (quarter - 1) * 3;
    const start = new Date(Date.UTC(targetYear, startMonth, 1));
    const end = new Date(Date.UTC(targetYear, startMonth + 3, 0, 23, 59, 59, 999));
    return { start, end };
  }

  if (year !== null) {
    if (year < 1970 || year > 3000) {
      throwValidationError('Year is out of supported range');
    }
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year + 1, 0, 0, 23, 59, 59, 999));
    return { start, end };
  }

  if (hasCustomDates) {
    let start;
    let end;

    if (query.startDate) {
      start = new Date(query.startDate);
      if (Number.isNaN(start.getTime())) {
        throwValidationError('Invalid startDate parameter');
      }
    }

    if (query.endDate) {
      end = new Date(query.endDate);
      if (Number.isNaN(end.getTime())) {
        throwValidationError('Invalid endDate parameter');
      }
      end.setHours(23, 59, 59, 999);
    }

    if (start && end && start > end) {
      throwValidationError('startDate cannot be greater than endDate');
    }

    return { start, end };
  }

  return null;
};

const formatDate = (date) => {
  if (!date) {
    return '';
  }
  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }
  return parsed.toISOString().split('T')[0];
};

const escapeCsvValue = (value) => {
  if (value === null || value === undefined) {
    return '""';
  }
  const stringValue = String(value ?? '');
  if (!stringValue.length) {
    return '""';
  }
  return `"${stringValue.replace(/"/g, '""')}"`;
};

const buildCsvContent = (headers, rows) => {
  const headerRow = headers.map(({ label }) => escapeCsvValue(label)).join(',');
  const dataRows = rows.map((row) =>
    headers.map(({ key }) => escapeCsvValue(row[key] ?? '')).join(',')
  );
  return [headerRow, ...dataRows].join('\n');
};

const calculateNoticePeriodDays = (resignationDate, lastWorkingDate) => {
  if (!resignationDate || !lastWorkingDate) {
    return '';
  }
  const start = new Date(resignationDate);
  const end = new Date(lastWorkingDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return '';
  }
  const diffMs = end - start;
  if (Number.isNaN(diffMs)) {
    return '';
  }
  const diffDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  return diffDays;
};

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

// @desc    Export resignations as CSV with filters
// @route   GET /api/resignations/export
// @access  Private (Human Resources dept only)
export const exportResignationsCsv = async (req, res) => {
  try {
    const {
      status,
      departmentId,
      departmentName,
      dateField: requestedDateField,
    } = req.query;

    const dateField = VALID_DATE_FIELDS.includes(requestedDateField)
      ? requestedDateField
      : 'lastWorkingDate';

    const query = {};

    const dateRange = buildDateRange(req.query);
    if (dateRange) {
      query[dateField] = {};
      if (dateRange.start) {
        query[dateField].$gte = dateRange.start;
      }
      if (dateRange.end) {
        query[dateField].$lte = dateRange.end;
      }
      if (!Object.keys(query[dateField]).length) {
        delete query[dateField];
      }
    }

    if (status) {
      const allowedStatuses = ['pending', 'approved', 'rejected', 'completed'];
      const statusFilters = status
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter((item) => allowedStatuses.includes(item));

      if (!statusFilters.length) {
        const error = new Error('Invalid status filter provided');
        error.statusCode = 400;
        throw error;
      }

      query.status = statusFilters.length === 1 ? statusFilters[0] : { $in: statusFilters };
    }

    const resignations = await Resignation.find(query)
      .populate({
        path: 'employee',
        select: 'firstName lastName employeeId email department position managementLevel',
        populate: { path: 'department', select: 'name' },
      })
      .populate('approvedBy', 'firstName lastName employeeId email')
      .lean();

    const filteredByDepartment = resignations.filter((record) => record.employee);

    const normalizedDepartmentName = departmentName?.trim().toLowerCase();

    const finalResignations = filteredByDepartment.filter((record) => {
      const employeeDepartment = record.employee?.department;

      if (departmentId && employeeDepartment?._id?.toString() !== departmentId) {
        return false;
      }

      if (normalizedDepartmentName) {
        const comparesTo = (employeeDepartment?.name || '').trim().toLowerCase();
        if (comparesTo !== normalizedDepartmentName) {
          return false;
        }
      }

      return true;
    });

    const exitProcedureKeys = ['assetReturn', 'exitInterview', 'knowledgeTransfer', 'clearance', 'finalSettlement'];

    const rows = finalResignations.map((record) => {
      const employee = record.employee || {};
      const approvedBy = record.approvedBy || {};
      const exitProcedures = record.exitProcedures || {};

      const row = {
        employeeName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
        employeeId: employee.employeeId || '',
        employeeEmail: employee.email || '',
        department: employee.department?.name || '',
        position: employee.position || '',
        managementLevel: typeof employee.managementLevel === 'number' ? `L${employee.managementLevel}` : '',
        status: record.status,
        resignationDate: formatDate(record.resignationDate),
        lastWorkingDate: formatDate(record.lastWorkingDate),
        noticePeriodDays: calculateNoticePeriodDays(record.resignationDate, record.lastWorkingDate),
        reason: record.reason || '',
        approvedBy: `${approvedBy.firstName || ''} ${approvedBy.lastName || ''}`.trim(),
        approvedByEmployeeId: approvedBy.employeeId || '',
        approvalDate: formatDate(record.approvalDate),
        approvalRemarks: record.approvalRemarks || '',
      };

      exitProcedureKeys.forEach((key) => {
        const procedure = exitProcedures[key] || {};
        row[`${key}Status`] = procedure.status || 'pending';
        row[`${key}CompletedDate`] = formatDate(procedure.completedDate);
      });

      return row;
    });

    const headers = [
      { label: 'Employee Name', key: 'employeeName' },
      { label: 'Employee ID', key: 'employeeId' },
      { label: 'Employee Email', key: 'employeeEmail' },
      { label: 'Department', key: 'department' },
      { label: 'Position', key: 'position' },
      { label: 'Management Level', key: 'managementLevel' },
      { label: 'Status', key: 'status' },
      { label: 'Resignation Date', key: 'resignationDate' },
      { label: 'Last Working Date', key: 'lastWorkingDate' },
      { label: 'Notice Period (days)', key: 'noticePeriodDays' },
      { label: 'Reason', key: 'reason' },
      { label: 'Approved By', key: 'approvedBy' },
      { label: 'Approved By (Employee ID)', key: 'approvedByEmployeeId' },
      { label: 'Approval Date', key: 'approvalDate' },
      { label: 'Approval Remarks', key: 'approvalRemarks' },
    ];

    exitProcedureKeys.forEach((key) => {
      const readableLabel = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (char) => char.toUpperCase());
      headers.push({ label: `${readableLabel} Status`, key: `${key}Status` });
      headers.push({ label: `${readableLabel} Completed Date`, key: `${key}CompletedDate` });
    });

    const csvContent = buildCsvContent(headers, rows);

    const nameParts = ['resignation-report'];
    if (req.query.year) {
      nameParts.push(`y${req.query.year}`);
    }
    if (req.query.month) {
      nameParts.push(`m${req.query.month}`);
    }
    if (req.query.quarter) {
      nameParts.push(`q${req.query.quarter}`);
    }
    const fileName = `${nameParts.join('-')}-${Date.now()}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

    return res.status(200).send(csvContent);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};
