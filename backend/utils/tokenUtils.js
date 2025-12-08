import jwt from 'jsonwebtoken';

const formatDepartmentPayload = (department) => {
  if (!department) return null;

  if (typeof department === 'string') {
    return { _id: department, name: null, code: null };
  }

  const plain = typeof department.toObject === 'function' ? department.toObject() : department;

  return {
    _id: plain?._id?.toString?.() || plain?.id || null,
    name: plain?.name || null,
    code: plain?.code || null,
  };
};

// Generate JWT Token
export const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// Response with token
export const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);

  const departmentPayload = formatDepartmentPayload(user.department);

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
      department: departmentPayload,
      departmentName: departmentPayload?.name || null,
      departmentCode: departmentPayload?.code || null,
      position: user.position,
      profileImage: user.profileImage,
      canApproveLeaves: user.canApproveLeaves,
      canManageAttendance: user.canManageAttendance,
      personalEmail: user.personalEmail,
      currentAddress: user.currentAddress,
      permanentAddress: user.permanentAddress,
    },
  });
};
