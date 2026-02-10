import User from '../models/User.js';

const LEAVE_ALLOCATION = {
  personal: 1,
  sick: 0.5,
  casual: 0.5,
};

export const getCurrentMonthKey = (date = new Date()) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export const getLeaveBalanceType = (leaveType) => {
  if (!leaveType) return null;
  const normalized = String(leaveType).trim().toLowerCase();
  if (normalized === 'personal') return 'personal';
  if (normalized === 'sick') return 'sick';
  if (normalized === 'casual') return 'casual';
  return null;
};

export const ensureMonthlyLeaveBalance = async (userId) => {
  if (!userId) {
    return null;
  }

  const monthKey = getCurrentMonthKey();
  const user = await User.findById(userId).select('leaveBalance leaveBalanceMonth');
  if (!user) {
    return null;
  }

  if (user.leaveBalanceMonth === monthKey) {
    return user;
  }

  const inc = {};
  Object.keys(LEAVE_ALLOCATION).forEach((key) => {
    inc[`leaveBalance.${key}`] = LEAVE_ALLOCATION[key];
  });

  return User.findByIdAndUpdate(
    userId,
    {
      $set: { leaveBalanceMonth: monthKey },
      $inc: inc,
    },
    { new: true, runValidators: true }
  ).select('leaveBalance leaveBalanceMonth');
};

export const getDefaultLeaveBalance = () => ({
  personal: 0,
  sick: 0,
  casual: 0,
});

export const getLeaveAllocation = () => ({ ...LEAVE_ALLOCATION });
