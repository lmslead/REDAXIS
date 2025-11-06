import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      req.user = await User.findById(decoded.id).select('-password');

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
