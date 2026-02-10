import { useState, useEffect } from 'react';
import { getUser, employeesAPI } from '../services/api';
import './Leaves.css';

// Import API from services
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getToken = () => localStorage.getItem('token');

const leaveAPI = {
  getAll: async (params = {}) => {
    const token = getToken();
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/leaves?${queryString}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.json();
  },
  
  create: async (data) => {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/leaves`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create leave');
    }
    return response.json();
  },
  
  updateStatus: async (id, status, remarks) => {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/leaves/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ status, remarks })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update status');
    }
    return response.json();
  },
  
  delete: async (id) => {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/leaves/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete leave');
    }
    return response.json();
  },
  updateBalance: async (employeeId, data) => {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/leaves/balance/${employeeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update leave balance');
    }
    return response.json();
  }
};

const Leaves = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [balanceEmployees, setBalanceEmployees] = useState([]);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceEmployeeSearch, setBalanceEmployeeSearch] = useState('');
  const [balanceSaveMessage, setBalanceSaveMessage] = useState('');
  const [balanceForm, setBalanceForm] = useState({
    employeeId: '',
    personal: '',
    sick: '',
    casual: ''
  });
  const [filterStatus, setFilterStatus] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });
  
  const currentUser = getUser();
  console.log('🔍 Current User in Leaves:', currentUser);
  
  // L1+ can manage leaves (L1, L2, L3)
  const canManage = currentUser?.managementLevel >= 1;
  const financeDepartmentNames = ['finance', 'finance department', 'finance & accounts', 'accounts', 'accounting'];
  const currentDepartmentName = (currentUser?.department?.name || currentUser?.departmentName || '')
    .trim()
    .toLowerCase();
  const isFinanceL3User = currentUser?.managementLevel === 3 && financeDepartmentNames.includes(currentDepartmentName);
  const canEditBalances = currentUser?.managementLevel >= 4 || isFinanceL3User;
  
  const [newLeave, setNewLeave] = useState({
    leaveType: 'casual',
    leaveDuration: 'full',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const leaveTypeOptions = [
    { value: 'personal', label: 'PL (Paid Leave)', icon: '🧘', color: 'info' },
    { value: 'casual', label: 'Casual Leave', icon: '🏖️', color: 'primary' },
    { value: 'sick', label: 'Sick Leave', icon: '🤒', color: 'danger' },
    { value: 'unpaid', label: 'Unpaid Leave', icon: '📅', color: 'secondary' }
  ];

  const leaveTypeStyles = [
    ...leaveTypeOptions,
    { value: 'half-day', label: 'Half Day Leave', icon: '⏰', color: 'warning' },
    { value: 'earned', label: 'Earned Leave', icon: '✈️', color: 'success' },
    { value: 'privilege', label: 'Privilege Leave', icon: '✈️', color: 'success' },
    { value: 'maternity', label: 'Maternity Leave', icon: '🤰', color: 'success' },
    { value: 'paternity', label: 'Paternity Leave', icon: '👶', color: 'success' }
  ];

  useEffect(() => {
    fetchLeaves();
  }, [filterStatus]);

  const fetchLeaves = async () => {
    try {
      const params = {};
      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }
      
      const response = await leaveAPI.getAll(params);
      console.log('Fetched leaves:', response.data);
      console.log('Current user:', currentUser);
      console.log('Can manage:', canManage);
      setLeaves(response.data);
      
      // Calculate stats
      const allLeaves = filterStatus === 'all' ? response.data : await leaveAPI.getAll({});
      const allLeavesData = filterStatus === 'all' ? response.data : allLeaves.data;
      
      setStats({
        total: allLeavesData.length,
        pending: allLeavesData.filter(l => l.status === 'pending').length,
        approved: allLeavesData.filter(l => l.status === 'approved').length,
        rejected: allLeavesData.filter(l => l.status === 'rejected').length
      });
    } catch (error) {
      console.error('Error fetching leaves:', error);
      alert('Failed to fetch leaves');
    } finally {
      setLoading(false);
    }
  };

  const calculateDays = (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!newLeave.startDate || !newLeave.endDate || !newLeave.reason) {
      alert('Please fill all required fields');
      return;
    }
    
    if (new Date(newLeave.endDate) < new Date(newLeave.startDate)) {
      alert('End date must be after start date');
      return;
    }
    
    try {
      const isHalfDay = newLeave.leaveDuration === 'half';
      const days = isHalfDay ? 0.5 : calculateDays(newLeave.startDate, newLeave.endDate);

      if (isHalfDay && newLeave.startDate !== newLeave.endDate) {
        alert('Half-day leave must be for a single date');
        return;
      }

      await leaveAPI.create({
        ...newLeave,
        days
      });
      
      alert('Leave application submitted successfully!');
      setShowApplyModal(false);
      setNewLeave({ leaveType: 'casual', leaveDuration: 'full', startDate: '', endDate: '', reason: '' });
      fetchLeaves();
    } catch (error) {
      alert(error.message || 'Failed to apply for leave');
    }
  };

  const openBalanceModal = async () => {
    setShowBalanceModal(true);
    setBalanceEmployeeSearch('');
    setBalanceSaveMessage('');
    setBalanceLoading(true);
    try {
      const response = await employeesAPI.getAll();
      const list = response.data || [];
      setBalanceEmployees(list);
      if (list.length && !balanceForm.employeeId) {
        const first = list[0];
        setBalanceForm({
          employeeId: first._id,
          personal: first.leaveBalance?.personal ?? 0,
          sick: first.leaveBalance?.sick ?? 0,
          casual: first.leaveBalance?.casual ?? 0,
        });
      }
    } catch (error) {
      alert(error.message || 'Failed to load employees');
    } finally {
      setBalanceLoading(false);
    }
  };

  const handleBalanceEmployeeChange = (employeeId) => {
    const employee = balanceEmployees.find((item) => item._id === employeeId);
    setBalanceSaveMessage('');
    setBalanceForm({
      employeeId,
      personal: employee?.leaveBalance?.personal ?? 0,
      sick: employee?.leaveBalance?.sick ?? 0,
      casual: employee?.leaveBalance?.casual ?? 0,
    });
  };

  const handleBalanceSave = async (e) => {
    e.preventDefault();
    if (!balanceForm.employeeId) {
      return;
    }
    try {
      setBalanceLoading(true);
      setBalanceSaveMessage('');
      const response = await leaveAPI.updateBalance(balanceForm.employeeId, {
        personal: balanceForm.personal,
        sick: balanceForm.sick,
        casual: balanceForm.casual,
      });

      const updated = response?.data;
      if (updated?._id) {
        setBalanceEmployees((prev) =>
          prev.map((employee) => (employee._id === updated._id ? { ...employee, ...updated } : employee))
        );
      }

      setBalanceSaveMessage('Leave balance updated successfully.');
    } catch (error) {
      alert(error.message || 'Failed to update leave balance');
    } finally {
      setBalanceLoading(false);
    }
  };

  const getBalanceEmployeeDisplayName = (employee) => {
    if (!employee) {
      return '';
    }
    const name = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
    const code = employee.employeeId ? ` (${employee.employeeId})` : '';
    return `${name}${code}`.trim();
  };

  const normalizeSearchText = (value) =>
    String(value || '')
      .toLowerCase()
      .replace(/[\s(){}._-]+|\[|\]/g, '');

  const balanceEmployeesFiltered = balanceEmployees.filter((employee) => {
    if (!balanceEmployeeSearch.trim()) {
      return true;
    }

    const term = normalizeSearchText(balanceEmployeeSearch.trim());
    if (!term) {
      return true;
    }

    const haystack = normalizeSearchText(
      `${employee.firstName || ''} ${employee.lastName || ''} ${employee.employeeId || ''} ${employee.email || ''}`
    );

    return haystack.includes(term);
  });

  const selectedBalanceEmployee = balanceEmployees.find((employee) => employee._id === balanceForm.employeeId);
  const lastAdjustedAt = selectedBalanceEmployee?.leaveBalanceMeta?.lastAdjustedAt;
  const lastAdjustedBy = selectedBalanceEmployee?.leaveBalanceMeta?.lastAdjustedBy;
  const lastAdjustedByLabel = lastAdjustedBy
    ? `${lastAdjustedBy.firstName || ''} ${lastAdjustedBy.lastName || ''}`.trim() || lastAdjustedBy.employeeId || ''
    : '';

  const handleUpdateStatus = async (leaveId, status) => {
    const remarks = status === 'rejected' 
      ? prompt('Please provide a reason for rejection:')
      : '';
    
    if (status === 'rejected' && !remarks) {
      return;
    }
    
    try {
      await leaveAPI.updateStatus(leaveId, status, remarks);
      alert(`Leave ${status} successfully!`);
      fetchLeaves();
    } catch (error) {
      // Check if it's the HR authorization error
      const errorMessage = error.message || 'Failed to update leave status';
      alert(errorMessage);
      console.error('Update status error:', error);
    }
  };

  const handleCancelLeave = async (leaveId) => {
    if (!window.confirm('Are you sure you want to cancel this leave application?')) {
      return;
    }
    
    try {
      await leaveAPI.delete(leaveId);
      alert('Leave cancelled successfully!');
      fetchLeaves();
    } catch (error) {
      alert(error.message || 'Failed to cancel leave');
    }
  };

  const getLeaveTypeStyle = (type) => {
    return leaveTypeStyles.find(lt => lt.value === type) || leaveTypeStyles[0];
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const filteredLeaves = leaves.filter(leave => {
    console.log('🔍 Filtering - canManage:', canManage, 'managementLevel:', currentUser?.managementLevel);
    
    if (!canManage) {
      // Handle both populated and non-populated employee field
      const employeeId = typeof leave.employee === 'object' && leave.employee ? leave.employee._id : leave.employee;
      const currentUserId = currentUser?._id || currentUser?.id;
      
      console.log('Filtering leave:', {
        leaveId: leave._id,
        employeeId: String(employeeId || ''),
        currentUserId: String(currentUserId || ''),
        match: String(employeeId) === String(currentUserId)
      });
      
      return String(employeeId) === String(currentUserId);
    }
    
    console.log('✅ Admin/Manager - showing all leaves');
    return true;
  });
  
  console.log('Total leaves:', leaves.length);
  console.log('Filtered leaves:', filteredLeaves.length);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="row mb-4">
        <div className="col">
          <h2 className="fw-bold">Leave Management</h2>
          <p className="text-muted">Manage employee leave requests</p>
        </div>
        <div className="col-auto">
          <div className="d-flex gap-2">
            {canEditBalances && (
              <button className="btn btn-outline-primary" onClick={openBalanceModal}>
                <i className="bi bi-sliders me-2"></i>Adjust Balance
              </button>
            )}
            <button className="btn btn-primary" onClick={() => setShowApplyModal(true)}>
              <i className="bi bi-calendar-plus me-2"></i>Apply for Leave
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="text-muted mb-1">Total Leaves</p>
                  <h3 className="fw-bold mb-0">{stats.total}</h3>
                </div>
                <div className="bg-primary bg-opacity-10 p-3 rounded">
                  <i className="bi bi-calendar3 text-primary fs-4"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="text-muted mb-1">Pending</p>
                  <h3 className="fw-bold mb-0 text-warning">{stats.pending}</h3>
                </div>
                <div className="bg-warning bg-opacity-10 p-3 rounded">
                  <i className="bi bi-clock-history text-warning fs-4"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="text-muted mb-1">Approved</p>
                  <h3 className="fw-bold mb-0 text-success">{stats.approved}</h3>
                </div>
                <div className="bg-success bg-opacity-10 p-3 rounded">
                  <i className="bi bi-check-circle text-success fs-4"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="text-muted mb-1">Rejected</p>
                  <h3 className="fw-bold mb-0 text-danger">{stats.rejected}</h3>
                </div>
                <div className="bg-danger bg-opacity-10 p-3 rounded">
                  <i className="bi bi-x-circle text-danger fs-4"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <h6 className="fw-bold mb-3">
            <i className="bi bi-funnel me-2"></i>Filter by Status
          </h6>
          <div className="btn-group w-100" role="group">
            <button
              className={`btn ${filterStatus === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setFilterStatus('all')}
            >
              <i className="bi bi-grid-3x3-gap me-2"></i>All
              <span className="badge bg-light text-dark ms-2">{stats.total}</span>
            </button>
            <button
              className={`btn ${filterStatus === 'pending' ? 'btn-warning' : 'btn-outline-warning'}`}
              onClick={() => setFilterStatus('pending')}
            >
              <i className="bi bi-clock-history me-2"></i>Pending
              <span className="badge bg-light text-dark ms-2">{stats.pending}</span>
            </button>
            <button
              className={`btn ${filterStatus === 'approved' ? 'btn-success' : 'btn-outline-success'}`}
              onClick={() => setFilterStatus('approved')}
            >
              <i className="bi bi-check-circle me-2"></i>Approved
              <span className="badge bg-light text-dark ms-2">{stats.approved}</span>
            </button>
            <button
              className={`btn ${filterStatus === 'rejected' ? 'btn-danger' : 'btn-outline-danger'}`}
              onClick={() => setFilterStatus('rejected')}
            >
              <i className="bi bi-x-circle me-2"></i>Rejected
              <span className="badge bg-light text-dark ms-2">{stats.rejected}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Leave Requests List */}
      <div className="row">
        {filteredLeaves.length === 0 ? (
          <div className="col-12 text-center py-5 text-muted">
            <i className="bi bi-calendar-x fs-1 d-block mb-2"></i>
            <p>No leave requests found</p>
          </div>
        ) : (
          filteredLeaves.map(leave => {
            const leaveTypeStyle = getLeaveTypeStyle(leave.leaveType);
            const employeeId = typeof leave.employee === 'object' && leave.employee ? leave.employee._id : leave.employee;
            const currentUserId = currentUser?._id || currentUser?.id;
            const isMyLeave = String(employeeId || '') === String(currentUserId || '');
            
            return (
              <div key={leave._id} className="col-md-6 col-lg-4 mb-4">
                <div className="card border-0 shadow-sm h-100">
                  <div className={`card-header bg-${leaveTypeStyle.color} text-white`}>
                    <h6 className="mb-0">
                      <span className="me-2">{leaveTypeStyle.icon}</span>
                      {leaveTypeStyle.label}
                    </h6>
                  </div>
                  <div className="card-body">
                    <div className="d-flex align-items-center mb-3">
                      <img
                        src={leave.employee?.profileImage || '/assets/client.jpg'}
                        alt={leave.employee?.firstName}
                        className="rounded-circle me-2"
                        style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                      />
                      <div>
                        <strong className="d-block">
                          {leave.employee?.firstName} {leave.employee?.lastName}
                        </strong>
                        <small className="text-muted">
                          {leave.employee?.employeeId}
                        </small>
                      </div>
                    </div>

                    <div className="mb-2">
                      <small className="text-muted d-block">Duration</small>
                      <strong>{formatDate(leave.startDate)} - {formatDate(leave.endDate)}</strong>
                      <span className="badge bg-light text-dark ms-2">{leave.days} {leave.days === 1 ? 'day' : 'days'}</span>
                    </div>

                    <div className="mb-3">
                      <small className="text-muted d-block">Reason</small>
                      <p className="mb-0">{leave.reason}</p>
                    </div>

                    {leave.remarks && (
                      <div className="mb-3">
                        <small className="text-muted d-block">Remarks</small>
                        <p className="mb-0 text-danger">{leave.remarks}</p>
                      </div>
                    )}

                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <span className={`badge bg-${
                        leave.status === 'pending' ? 'warning' :
                        leave.status === 'approved' ? 'success' : 'danger'
                      }`}>
                        {leave.status.toUpperCase()}
                      </span>
                      <small className="text-muted">
                        Applied: {formatDate(leave.createdAt)}
                      </small>
                    </div>

                    {/* Approver Information */}
                    {leave.approvedBy && leave.status !== 'pending' && (
                      <div className="mb-3 p-2 bg-light rounded">
                        <small className="text-muted d-block">
                          {leave.status === 'approved' ? 'Approved' : 'Rejected'} by
                        </small>
                        <strong className="text-primary">
                          {leave.approvedBy.firstName} {leave.approvedBy.lastName}
                        </strong>
                        <small className="text-muted ms-2">
                          ({leave.approvedBy.employeeId})
                        </small>
                        {leave.approvalDate && (
                          <small className="d-block text-muted">
                            on {formatDate(leave.approvalDate)}
                          </small>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="d-flex gap-2">
                      {canManage && leave.status === 'pending' && (() => {
                        // RM Hierarchy: Check if user can approve this leave
                        const employeeLevel = leave.employee?.managementLevel || 0;
                        const userLevel = currentUser?.managementLevel || 0;
                        const isOwnLeave = leave.employee?._id === currentUser?._id;
                        
                        // Cannot approve own leave
                        if (isOwnLeave) {
                          return (
                            <div className="alert alert-warning mb-0 py-2 px-3 small w-100">
                              <i className="bi bi-exclamation-triangle me-2"></i>
                              You cannot approve your own leave
                            </div>
                          );
                        }
                        
                        // L1 can only approve L0
                        if (userLevel === 1 && employeeLevel !== 0) {
                          return null; // Don't show buttons
                        }
                        
                        // L2 can approve L0 and L1
                        if (userLevel === 2 && employeeLevel >= 2) {
                          return null; // Don't show buttons
                        }
                        
                        // L3 can approve L0, L1, L2 only (NOT L3 or L4)
                        if (userLevel === 3 && employeeLevel >= 3) {
                          return (
                            <div className="alert alert-warning mb-0 py-2 px-3 small w-100">
                              <i className="bi bi-exclamation-triangle me-2"></i>
                              Only L4 (CEO/Owner) can approve L{employeeLevel} level leaves
                            </div>
                          );
                        }
                        
                        // L4 can approve all levels

                        return (
                          <>
                            <button
                              className="btn btn-sm btn-success flex-fill"
                              onClick={() => handleUpdateStatus(leave._id, 'approved')}
                            >
                              <i className="bi bi-check-lg me-1"></i>Approve
                            </button>
                            <button
                              className="btn btn-sm btn-danger flex-fill"
                              onClick={() => handleUpdateStatus(leave._id, 'rejected')}
                            >
                              <i className="bi bi-x-lg me-1"></i>Reject
                            </button>
                          </>
                        );
                      })()}
                      
                      {isMyLeave && leave.status === 'pending' && (
                        <button
                          className="btn btn-sm btn-outline-danger flex-fill"
                          onClick={() => handleCancelLeave(leave._id)}
                        >
                          <i className="bi bi-trash me-1"></i>Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Apply Leave Modal */}
      {showApplyModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Apply for Leave</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowApplyModal(false);
                    setNewLeave({ leaveType: 'casual', startDate: '', endDate: '', reason: '' });
                  }}
                ></button>
              </div>
              <form onSubmit={handleApplyLeave}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Leave Type</label>
                    <select
                      className="form-select"
                      value={newLeave.leaveType}
                      onChange={(e) => {
                        const nextType = e.target.value;
                        const keepHalf = ['sick', 'casual'].includes(nextType) ? newLeave.leaveDuration : 'full';
                        setNewLeave({
                          ...newLeave,
                          leaveType: nextType,
                          leaveDuration: keepHalf,
                          endDate: keepHalf === 'half' ? newLeave.startDate : newLeave.endDate,
                        });
                      }}
                    >
                      {leaveTypeOptions.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.icon} {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {['sick', 'casual'].includes(newLeave.leaveType) && (
                    <div className="mb-3">
                      <label className="form-label">Duration</label>
                      <select
                        className="form-select"
                        value={newLeave.leaveDuration}
                        onChange={(e) => {
                          const leaveDuration = e.target.value;
                          setNewLeave({
                            ...newLeave,
                            leaveDuration,
                            endDate: leaveDuration === 'half' ? newLeave.startDate : newLeave.endDate,
                          });
                        }}
                      >
                        <option value="full">Full Day</option>
                        <option value="half">Half Day</option>
                      </select>
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label">Start Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={newLeave.startDate}
                      onChange={(e) => {
                        const startDate = e.target.value;
                        setNewLeave({
                          ...newLeave,
                          startDate,
                          endDate: newLeave.leaveDuration === 'half' ? startDate : newLeave.endDate,
                        });
                      }}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">End Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={newLeave.endDate}
                      onChange={(e) => setNewLeave({ ...newLeave, endDate: e.target.value })}
                      required
                      disabled={newLeave.leaveDuration === 'half'}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Reason</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={newLeave.reason}
                      onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                      placeholder="Enter your reason for leave..."
                      required
                    ></textarea>
                  </div>

                  {newLeave.startDate && newLeave.endDate && (
                    <div className="alert alert-info">
                      <i className="bi bi-info-circle me-2"></i>
                      <strong>Duration:</strong> {newLeave.leaveDuration === 'half' ? 0.5 : calculateDays(newLeave.startDate, newLeave.endDate)} {newLeave.leaveDuration === 'half' || calculateDays(newLeave.startDate, newLeave.endDate) === 1 ? 'day' : 'days'}
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowApplyModal(false);
                      setNewLeave({ leaveType: 'casual', leaveDuration: 'full', startDate: '', endDate: '', reason: '' });
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <i className="bi bi-send me-2"></i>Submit Application
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showBalanceModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Adjust Leave Balance</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowBalanceModal(false)}
                ></button>
              </div>
              <form onSubmit={handleBalanceSave}>
                <div className="modal-body">
                  {balanceSaveMessage && (
                    <div className="alert alert-success py-2 small" role="alert">
                      <i className="bi bi-check-circle me-2"></i>
                      {balanceSaveMessage}
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label">Employee</label>
                    <input
                      type="text"
                      className="form-control mb-2"
                      placeholder="🔍 Search by name or code..."
                      value={balanceEmployeeSearch}
                      onChange={(e) => setBalanceEmployeeSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                        }
                      }}
                      autoFocus
                    />
                    <select
                      className="form-select"
                      value={balanceForm.employeeId}
                      onChange={(e) => handleBalanceEmployeeChange(e.target.value)}
                      disabled={balanceLoading}
                      required
                    >
                      {balanceEmployeesFiltered.map((employee) => (
                        <option key={employee._id} value={employee._id}>
                          {getBalanceEmployeeDisplayName(employee)}
                          {employee.leaveBalanceMeta?.lastAdjustedAt
                            ? ` — updated${employee.leaveBalanceMeta?.lastAdjustedBy?.firstName ? ` by ${(
                                `${employee.leaveBalanceMeta.lastAdjustedBy.firstName || ''} ${employee.leaveBalanceMeta.lastAdjustedBy.lastName || ''}`
                              ).trim()}` : ''}`
                            : ''}
                        </option>
                      ))}
                    </select>

                    {lastAdjustedAt ? (
                      <div className="text-muted small mt-2">
                        <i className="bi bi-info-circle me-1"></i>
                        Updated previously: {new Date(lastAdjustedAt).toLocaleString()}
                        {lastAdjustedByLabel ? ` by ${lastAdjustedByLabel}` : ''}
                      </div>
                    ) : (
                      <div className="text-muted small mt-2">
                        <i className="bi bi-info-circle me-1"></i>
                        Not updated yet
                      </div>
                    )}
                    {balanceEmployeeSearch.trim() && (
                      <div className="text-muted small mt-1">
                        Showing {balanceEmployeesFiltered.length} of {balanceEmployees.length} employees
                      </div>
                    )}
                  </div>

                  <div className="row g-3">
                    <div className="col-12 col-md-4">
                      <label className="form-label">PL (Paid Leave)</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        className="form-control"
                        value={balanceForm.personal}
                        onChange={(e) => setBalanceForm({ ...balanceForm, personal: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label">Sick</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        className="form-control"
                        value={balanceForm.sick}
                        onChange={(e) => setBalanceForm({ ...balanceForm, sick: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label">Casual</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        className="form-control"
                        value={balanceForm.casual}
                        onChange={(e) => setBalanceForm({ ...balanceForm, casual: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowBalanceModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={balanceLoading}>
                    {balanceLoading ? 'Saving...' : 'Save Balance'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaves;
