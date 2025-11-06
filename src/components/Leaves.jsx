import { useState, useEffect } from 'react';
import { getUser } from '../services/api';
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
  }
};

const Leaves = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
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
  
  const [newLeave, setNewLeave] = useState({
    leaveType: 'casual',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const leaveTypes = [
    { value: 'casual', label: 'Casual Leave', icon: '🏖️', color: 'primary' },
    { value: 'sick', label: 'Sick Leave', icon: '🤒', color: 'danger' },
    { value: 'half-day', label: 'Half Day Leave', icon: '⏰', color: 'warning' },
    { value: 'privilege', label: 'Privilege Leave', icon: '✈️', color: 'success' },
    { value: 'unpaid', label: 'Unpaid Leave', icon: '📅', color: 'secondary' }
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
      const days = calculateDays(newLeave.startDate, newLeave.endDate);
      
      await leaveAPI.create({
        ...newLeave,
        days
      });
      
      alert('Leave application submitted successfully!');
      setShowApplyModal(false);
      setNewLeave({ leaveType: 'casual', startDate: '', endDate: '', reason: '' });
      fetchLeaves();
    } catch (error) {
      alert(error.message || 'Failed to apply for leave');
    }
  };

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
    return leaveTypes.find(lt => lt.value === type) || leaveTypes[0];
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
          <button className="btn btn-primary" onClick={() => setShowApplyModal(true)}>
            <i className="bi bi-calendar-plus me-2"></i>Apply for Leave
          </button>
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
                      onChange={(e) => setNewLeave({ ...newLeave, leaveType: e.target.value })}
                    >
                      {leaveTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.icon} {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Start Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={newLeave.startDate}
                      onChange={(e) => setNewLeave({ ...newLeave, startDate: e.target.value })}
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
                      <strong>Duration:</strong> {calculateDays(newLeave.startDate, newLeave.endDate)} {calculateDays(newLeave.startDate, newLeave.endDate) === 1 ? 'day' : 'days'}
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowApplyModal(false);
                      setNewLeave({ leaveType: 'casual', startDate: '', endDate: '', reason: '' });
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
    </div>
  );
};

export default Leaves;
