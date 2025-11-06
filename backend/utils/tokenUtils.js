import jwt from 'jsonwebtoken';

// Generate JWT Token
export const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// Response with token
export const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      employeeId: user.employeeId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      managementLevel: user.managementLevel || 0, // Include management level
      department: user.department,
      position: user.position,
      profileImage: user.profileImage,
      canApproveLeaves: user.canApproveLeaves,
      canManageAttendance: user.canManageAttendance,
    },
  });
};
