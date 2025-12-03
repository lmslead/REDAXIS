import Department from '../models/Department.js';
import User from '../models/User.js';

const normalizeParentId = (value) => {
  if (value === '' || value === undefined || value === null) {
    return null;
  }
  return value;
};

const ensureValidParent = async (parentId, currentId = null) => {
  if (!parentId) {
    return null;
  }

  if (currentId && parentId.toString() === currentId.toString()) {
    throw new Error('Department cannot be its own parent');
  }

  let parent = await Department.findById(parentId).select('parentDepartment');
  if (!parent) {
    throw new Error('Selected parent department does not exist');
  }

  if (currentId) {
    let ancestor = parent;
    while (ancestor?.parentDepartment) {
      if (ancestor.parentDepartment.toString() === currentId.toString()) {
        throw new Error('Cannot assign a sub-department as parent');
      }
      ancestor = await Department.findById(ancestor.parentDepartment).select('parentDepartment');
    }
  }

  return parentId;
};

export const getDepartments = async (req, res) => {
  try {
    const departments = await Department.find()
      .populate('manager', 'firstName lastName email')
      .populate('parentDepartment', 'name');

    const childCountMap = {};
    departments.forEach((dept) => {
      const parentRef = dept.parentDepartment?._id || null;
      if (parentRef) {
        const key = parentRef.toString();
        childCountMap[key] = (childCountMap[key] || 0) + 1;
      }
    });

    // Get employee counts for each department from User model
    const departmentsWithEmployees = await Promise.all(
      departments.map(async (dept) => {
        const employeeCount = await User.countDocuments({ department: dept._id });
        const employees = await User.find({ department: dept._id })
          .select('firstName lastName employeeId')
          .limit(100); // Limit to prevent huge responses
        
        return {
          ...dept.toObject(),
          employees: employees,
          employeeCount: employeeCount,
          childCount: childCountMap[dept._id.toString()] || 0,
        };
      })
    );

    res.status(200).json({ success: true, count: departmentsWithEmployees.length, data: departmentsWithEmployees });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createDepartment = async (req, res) => {
  try {
    const payload = { ...req.body };
    payload.parentDepartment = await ensureValidParent(normalizeParentId(req.body.parentDepartment));

    const department = await Department.create(payload);
    res.status(201).json({ success: true, data: department });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateDepartment = async (req, res) => {
  try {
    const payload = { ...req.body };

    if ('parentDepartment' in req.body) {
      payload.parentDepartment = await ensureValidParent(
        normalizeParentId(req.body.parentDepartment),
        req.params.id
      );
    }

    const department = await Department.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });

    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    res.status(200).json({ success: true, data: department });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);

    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    // Check if department has employees assigned in User model
    const employeeCount = await User.countDocuments({ department: req.params.id });
    if (employeeCount > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot delete department with ${employeeCount} assigned employee(s). Please reassign employees first.` 
      });
    }

    const childCount = await Department.countDocuments({ parentDepartment: req.params.id });
    if (childCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete department with ${childCount} sub-department(s). Please reassign or remove them first.`,
      });
    }

    await Department.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: 'Department deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
