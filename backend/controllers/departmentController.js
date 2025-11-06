import Department from '../models/Department.js';
import User from '../models/User.js';

export const getDepartments = async (req, res) => {
  try {
    const departments = await Department.find()
      .populate('manager', 'firstName lastName email');

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
          employeeCount: employeeCount
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
    const department = await Department.create(req.body);
    res.status(201).json({ success: true, data: department });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateDepartment = async (req, res) => {
  try {
    const department = await Department.findByIdAndUpdate(req.params.id, req.body, {
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

    await Department.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: 'Department deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
