import User from '../models/User.js';
import { sendTokenResponse } from '../utils/tokenUtils.js';

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const { employeeId, email, password, firstName, lastName, role, department, position } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ $or: [{ email }, { employeeId }] });

    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Create user
    const user = await User.create({
      employeeId,
      email,
      password,
      firstName,
      lastName,
      role: role || 'employee',
      department,
      position,
    });
    await user.populate('department', 'name code');

    sendTokenResponse(user, 201, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    // Check for user
    const user = await User.findOne({ email })
      .select('+password')
      .populate('department', 'name code');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if user account is inactive (resigned and completed exit procedures)
    if (user.status === 'inactive' || user.isActive === false) {
      return res.status(403).json({ 
        success: false, 
        message: 'Your account has been deactivated. Please contact HR for assistance.' 
      });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('department')
      .populate('reportingManager', 'firstName lastName employeeId email managementLevel');

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const sanitizeString = (value) => {
      if (typeof value !== 'string') return value;
      const trimmed = value.trim();
      return trimmed.length ? trimmed : undefined;
    };

    const sanitizeAddress = (address = {}) => {
      if (!address || typeof address !== 'object') return undefined;
      const sanitized = {};
      ['street', 'city', 'state', 'zipCode', 'country'].forEach((field) => {
        const value = sanitizeString(address[field]);
        if (value !== undefined) {
          sanitized[field] = value;
        }
      });
      return Object.keys(sanitized).length ? sanitized : undefined;
    };

    const sanitizeNested = (source = {}, allowedFields = []) => {
      if (!source || typeof source !== 'object') return undefined;
      const sanitized = {};
      allowedFields.forEach((field) => {
        const value = sanitizeString(source[field]) ?? source[field];
        if (value !== undefined && value !== null && value !== '') {
          sanitized[field] = value;
        }
      });
      return Object.keys(sanitized).length ? sanitized : undefined;
    };

    const currentAddressInput = req.body.currentAddress || req.body.address;
    const permanentAddressInput = req.body.permanentAddress || req.body.currentAddress || req.body.address;
    const fieldsToUpdate = {};

    const setIfDefined = (key, value) => {
      const sanitizedValue = sanitizeString(value);
      if (sanitizedValue !== undefined) {
        fieldsToUpdate[key] = sanitizedValue;
      }
    };

    setIfDefined('phone', req.body.phone);
    setIfDefined('personalEmail', req.body.personalEmail);
    setIfDefined('dateOfBirth', req.body.dateOfBirth);
    setIfDefined('panCard', req.body.panCard);
    setIfDefined('aadharCard', req.body.aadharCard);

    const sanitizedBankDetails = sanitizeNested(req.body.bankDetails, ['accountNumber', 'bankName', 'ifscCode']);
    if (sanitizedBankDetails) {
      fieldsToUpdate.bankDetails = sanitizedBankDetails;
    }

    const sanitizedComplianceDetails = sanitizeNested(req.body.complianceDetails, ['uanNumber', 'pfNumber', 'esiNumber']);
    if (sanitizedComplianceDetails) {
      fieldsToUpdate.complianceDetails = sanitizedComplianceDetails;
    }

    const sanitizedCurrentAddress = sanitizeAddress(currentAddressInput);
    if (sanitizedCurrentAddress) {
      fieldsToUpdate.currentAddress = sanitizedCurrentAddress;
      fieldsToUpdate.address = sanitizedCurrentAddress; // maintain backward compatibility
    }

    const sanitizedPermanentAddress = sanitizeAddress(permanentAddressInput);
    if (sanitizedPermanentAddress) {
      fieldsToUpdate.permanentAddress = sanitizedPermanentAddress;
    }

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true,
    })
      .populate('department', 'name code');

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
