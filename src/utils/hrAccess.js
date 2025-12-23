const HR_DEPARTMENT_ALIASES = [
  'human resources',
  'human resource',
  'hr',
  'people operations',
];

export const normalizeDepartmentName = (department) => {
  if (!department) {
    return '';
  }

  if (typeof department === 'string') {
    return department.trim().toLowerCase();
  }

  if (typeof department === 'object') {
    if (department.name) {
      return department.name.trim().toLowerCase();
    }
    if (department.departmentName) {
      return department.departmentName.trim().toLowerCase();
    }
  }

  return '';
};

export const isHumanResourcesUser = (user) => {
  if (!user) {
    return false;
  }

  if (user.role === 'hr') {
    return true;
  }

  const departmentName = normalizeDepartmentName(user.department);
  return departmentName ? HR_DEPARTMENT_ALIASES.includes(departmentName) : false;
};

export { HR_DEPARTMENT_ALIASES };
