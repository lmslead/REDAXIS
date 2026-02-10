import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const FINANCE_DEPARTMENT_NAMES = (process.env.FINANCE_DEPARTMENT_NAMES || 'Finance')
  .split(',')
  .map((name) => name.trim().toLowerCase())
  .filter(Boolean);

const HR_DEPARTMENT_NAMES = (process.env.HR_DEPARTMENT_NAMES || 'Human Resources,Human Resource,HR,People Operations')
  .split(',')
  .map((name) => name.trim().toLowerCase())
  .filter(Boolean);

export const normalizeDepartmentName = (department) => {
  if (!department) return '';
  if (typeof department === 'string') {
    return department.trim().toLowerCase();
  }
  if (department?.name) {
    return department.name.trim().toLowerCase();
  }
  return '';
};

export const isFinanceL3User = (user) => {
  if (!user) {
    return false;
  }

  const userLevel = user.managementLevel || 0;

  if (userLevel !== 3) {
    return false;
  }

  const departmentName = normalizeDepartmentName(user.department);

  return Boolean(departmentName && FINANCE_DEPARTMENT_NAMES.includes(departmentName));
};

export const isHRDepartmentUser = (user) => {
  if (!user) {
    return false;
  }

  if (user.role === 'hr') {
    return true;
  }

  const departmentName = normalizeDepartmentName(user.department);

  if (!departmentName) {
    return false;
  }

  return HR_DEPARTMENT_NAMES.includes(departmentName);
};

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      req.user = await User.findById(decoded.id)
        .select('-password')
        .populate('department', 'name code');

      if (!req.user) {
        return res.status(401).json({ success: false, message: 'User not found' });
      }

      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }
};

// Role-based authorization
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`,
      });
    }
    next();
  };
};

// Management Level-based authorization
// L0 = Employee (managementLevel: 0)
// L1 = Manager (managementLevel: 1)
// L2 = Senior Manager (managementLevel: 2)
// L3 = Admin (managementLevel: 3)
// L4 = CEO/Owner (managementLevel: 4)
export const authorizeLevel = (minLevel) => {
  return (req, res, next) => {
    const userLevel = req.user.managementLevel || 0;
    
    if (userLevel < minLevel) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required management level: L${minLevel}, Your level: L${userLevel}`,
      });
    }
    next();
  };
};

export const authorizeFinancePayslipUpload = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User session invalid. Please re-login.' });
    }

    let departmentName = normalizeDepartmentName(req.user.department);

    if (!departmentName && req.user.department) {
      const refreshedUser = await User.findById(req.user._id)
        .select('-password')
        .populate('department', 'name code');

      if (!refreshedUser) {
        return res.status(401).json({ success: false, message: 'User session invalid. Please re-login.' });
      }

      req.user = refreshedUser;
      departmentName = normalizeDepartmentName(refreshedUser.department);
    }

    if (!req.user.department && departmentName) {
      req.user.department = { name: departmentName };
    }

    if (isFinanceL3User(req.user)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Upload access restricted to Finance L3 users only',
    });
  } catch (error) {
    console.error('authorizeFinancePayslipUpload failed:', error);
    return res.status(500).json({ success: false, message: 'Unable to verify finance permissions' });
  }
};

export const authorizeHRDepartment = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'User session invalid. Please re-login.' });
  }

  if (isHRDepartmentUser(req.user)) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Access restricted to Human Resources department members only',
  });
};

export const authorizeFinanceL3OrL4 = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'User session invalid. Please re-login.' });
  }

  const userLevel = req.user.managementLevel || 0;

  if (userLevel >= 4) {
    return next();
  }

  if (isFinanceL3User(req.user)) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Access restricted to Finance L3 and L4 users only',
  });
};

export const authorizeExitDateUpdate = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'User session invalid. Please re-login.' });
  }

  const userLevel = req.user.managementLevel || 0;

  if (userLevel >= 4) {
    return next();
  }

  if (userLevel === 3 && (isFinanceL3User(req.user) || isHRDepartmentUser(req.user))) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Exit date updates are restricted to HR/Finance L3 and L4 users only',
  });
};
