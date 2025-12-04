import Payroll from '../models/Payroll.js';

export const getPayrolls = async (req, res) => {
  try {
    const { employeeId, month, year, status } = req.query;
    let query = {};

    if (employeeId) query.employee = employeeId;
    if (month) query.month = month;
    if (year) query.year = year;
    if (status) query.status = status;

    const payrolls = await Payroll.find(query)
      .populate({
        path: 'employee',
        select: 'firstName lastName employeeId email department position',
        populate: { path: 'department', select: 'name' },
      })
      .sort({ year: -1, month: -1 });

    res.status(200).json({ success: true, count: payrolls.length, data: payrolls });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPayroll = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id)
      .populate({
        path: 'employee',
        select: 'firstName lastName employeeId email department position',
        populate: { path: 'department', select: 'name' },
      });

    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Payroll not found' });
    }

    res.status(200).json({ success: true, data: payroll });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createPayroll = async (req, res) => {
  try {
    const payroll = await Payroll.create(req.body);
    res.status(201).json({ success: true, data: payroll });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePayroll = async (req, res) => {
  try {
    const payroll = await Payroll.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Payroll not found' });
    }

    res.status(200).json({ success: true, data: payroll });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deletePayroll = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);

    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Payroll not found' });
    }

    await payroll.deleteOne();

    res.status(200).json({ success: true, message: 'Payroll deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const processPayroll = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);

    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Payroll not found' });
    }

    payroll.status = 'processed';
    await payroll.save();
    await payroll.populate({
      path: 'employee',
      select: 'firstName lastName employeeId email department position',
      populate: { path: 'department', select: 'name' },
    });

    res.status(200).json({ success: true, data: payroll });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
