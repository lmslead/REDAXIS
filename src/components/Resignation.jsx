import { useState, useEffect } from 'react';
import { getUser } from '../services/api';
import './Resignation.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const getToken = () => localStorage.getItem('token');

const resignationAPI = {
  getAll: async () => {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/resignations`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.json();
  },
  
  submit: async (data) => {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/resignations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to submit resignation');
    }
    return response.json();
  },
  
  updateStatus: async (id, status, remarks) => {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/resignations/${id}/status`, {
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
  
  updateExitProcedure: async (id, procedureType, status, remarks) => {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/resignations/${id}/exit-procedure`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ procedureType, status, remarks })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update exit procedure');
    }
    return response.json();
  }
};

const Resignation = () => {
  const [resignations, setResignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedResignation, setSelectedResignation] = useState(null);
  const [formData, setFormData] = useState({
    lastWorkingDate: '',
    reason: '',
  });

  const currentUser = getUser();
  const canManage = currentUser?.managementLevel >= 3; // L3 and L4 can manage
  
  // Check if current user can manage a specific resignation
  const canManageResignation = (resignation) => {
    if (!canManage || !resignation?.employee) return false;
    // L4 can manage all resignations
    if (currentUser?.managementLevel === 4) return true;
    // L3 can only manage L0-L2 resignations
    if (currentUser?.managementLevel === 3) {
      return (resignation.employee.managementLevel || 0) < 3;
    }
    return false;
  };

  useEffect(() => {
    fetchResignations();
  }, []);

  const fetchResignations = async () => {
    try {
      const response = await resignationAPI.getAll();
      // Filter out any resignations with missing employee data
      const validResignations = (response.data || []).filter(resignation => 
        resignation && resignation.employee
      );
      setResignations(validResignations);
    } catch (error) {
      console.error('Error fetching resignations:', error);
      alert('Failed to fetch resignations. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await resignationAPI.submit(formData);
      alert('Resignation submitted successfully!');
      setShowModal(false);
      setFormData({ lastWorkingDate: '', reason: '' });
      fetchResignations();
    } catch (error) {
      alert(error.message || 'Failed to submit resignation');
    }
  };

  const handleStatusUpdate = async (id, status) => {
    const remarks = prompt(
      status === 'approved' 
        ? 'Enter approval remarks (optional):'
        : 'Enter rejection reason:'
    );
    
    if (status === 'rejected' && !remarks) {
      alert('Rejection reason is required');
      return;
    }

    try {
      await resignationAPI.updateStatus(id, status, remarks);
      alert(`Resignation ${status} successfully!`);
      fetchResignations();
    } catch (error) {
      alert(error.message || 'Failed to update status');
    }
  };

  const handleExitProcedure = async (procedureType, status) => {
    const remarks = prompt('Enter remarks (optional):');
    
    try {
      await resignationAPI.updateExitProcedure(
        selectedResignation._id,
        procedureType,
        status,
        remarks
      );
      alert('Exit procedure updated successfully!');
      fetchResignations();
      setShowExitModal(false);
      setSelectedResignation(null);
    } catch (error) {
      alert(error.message || 'Failed to update exit procedure');
    }
  };

  const openExitModal = (resignation) => {
    if (!resignation?.employee) {
      alert('Employee data not available for this resignation.');
      return;
    }
    setSelectedResignation(resignation);
    setShowExitModal(true);
  };

  const openDetailModal = (resignation) => {
    if (!resignation?.employee) {
      alert('Employee data not available for this resignation.');
      return;
    }
    setSelectedResignation(resignation);
    setShowDetailModal(true);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-warning',
      approved: 'bg-success',
      rejected: 'bg-danger',
      completed: 'bg-info'
    };
    return badges[status] || 'bg-secondary';
  };

  const stats = {
    total: resignations.length,
    pending: resignations.filter(r => r.status === 'pending').length,
    approved: resignations.filter(r => r.status === 'approved').length,
    completed: resignations.filter(r => r.status === 'completed').length,
  };

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
      <div className="row mb-4">
        <div className="col">
          <h2 className="fw-bold">Resignation & Exit Management</h2>
          <p className="text-muted">Manage resignations and exit procedures</p>
        </div>
        <div className="col-auto">
          <button className="btn btn-danger" onClick={() => setShowModal(true)}>
            <i className="bi bi-box-arrow-right me-2"></i>Submit Resignation
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <i className="bi bi-file-text fs-2 text-primary"></i>
                </div>
                <div className="flex-grow-1 ms-3">
                  <p className="text-muted mb-1">Total Resignations</p>
                  <h3 className="fw-bold mb-0">{stats.total}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <i className="bi bi-clock-history fs-2 text-warning"></i>
                </div>
                <div className="flex-grow-1 ms-3">
                  <p className="text-muted mb-1">Pending</p>
                  <h3 className="fw-bold mb-0 text-warning">{stats.pending}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <i className="bi bi-check-circle fs-2 text-success"></i>
                </div>
                <div className="flex-grow-1 ms-3">
                  <p className="text-muted mb-1">Approved</p>
                  <h3 className="fw-bold mb-0 text-success">{stats.approved}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <i className="bi bi-clipboard-check fs-2 text-info"></i>
                </div>
                <div className="flex-grow-1 ms-3">
                  <p className="text-muted mb-1">Completed</p>
                  <h3 className="fw-bold mb-0 text-info">{stats.completed}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Resignations List */}
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <h5 className="card-title mb-3">Resignation Requests</h5>
          {resignations.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-inbox fs-1 text-muted"></i>
              <p className="text-muted mt-3">No resignation requests found</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Resignation Date</th>
                    <th>Last Working Date</th>
                    <th>Reason</th>
                    <th>Status</th>
                    {canManage && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {resignations.map((resignation) => (
                    <tr 
                      key={resignation._id}
                      onClick={() => openDetailModal(resignation)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <div>
                          <strong>
                            {resignation.employee?.firstName || 'Unknown'} {resignation.employee?.lastName || 'Employee'}
                          </strong>
                          <br />
                          <small className="text-muted">{resignation.employee?.employeeId || 'N/A'}</small>
                        </div>
                      </td>
                      <td>{formatDate(resignation.resignationDate)}</td>
                      <td>{formatDate(resignation.lastWorkingDate)}</td>
                      <td>
                        <small>{resignation.reason.substring(0, 50)}...</small>
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadge(resignation.status)}`}>
                          {resignation.status.toUpperCase()}
                        </span>
                      </td>
                      {canManage && (
                        <td onClick={(e) => e.stopPropagation()}>
                          {resignation.status === 'pending' && canManageResignation(resignation) && (
                            <div className="btn-group btn-group-sm">
                              <button
                                className="btn btn-success"
                                onClick={() => handleStatusUpdate(resignation._id, 'approved')}
                              >
                                <i className="bi bi-check"></i>
                              </button>
                              <button
                                className="btn btn-danger"
                                onClick={() => handleStatusUpdate(resignation._id, 'rejected')}
                              >
                                <i className="bi bi-x"></i>
                              </button>
                            </div>
                          )}
                          {resignation.status === 'pending' && !canManageResignation(resignation) && (
                            <small className="text-muted">L4 Only</small>
                          )}
                          {resignation.status === 'approved' && canManageResignation(resignation) && (
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => openExitModal(resignation)}
                            >
                              <i className="bi bi-list-check me-1"></i>Exit Procedures
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Submit Resignation Modal */}
      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Submit Resignation</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Last Working Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={formData.lastWorkingDate}
                      onChange={(e) => setFormData({...formData, lastWorkingDate: e.target.value})}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Reason for Resignation *</label>
                    <textarea
                      className="form-control"
                      rows="4"
                      required
                      placeholder="Please provide your reason for resignation..."
                      value={formData.reason}
                      onChange={(e) => setFormData({...formData, reason: e.target.value})}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-danger">
                    Submit Resignation
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Exit Procedures Modal */}
      {showExitModal && selectedResignation && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Exit Procedures - {selectedResignation.employee?.firstName || 'Unknown'} {selectedResignation.employee?.lastName || 'Employee'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowExitModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="list-group">
                  {Object.entries(selectedResignation.exitProcedures).map(([key, procedure]) => (
                    <div key={key} className="list-group-item">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="mb-1">{key.replace(/([A-Z])/g, ' $1').toUpperCase()}</h6>
                          <span className={`badge ${procedure.status === 'completed' ? 'bg-success' : 'bg-warning'}`}>
                            {procedure.status.toUpperCase()}
                          </span>
                          {procedure.completedDate && (
                            <small className="text-muted ms-2">
                              Completed on {formatDate(procedure.completedDate)}
                            </small>
                          )}
                        </div>
                        {procedure.status === 'pending' && canManage && (
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => handleExitProcedure(key, 'completed')}
                          >
                            <i className="bi bi-check-lg me-1"></i>Mark Complete
                          </button>
                        )}
                      </div>
                      {procedure.remarks && (
                        <p className="mb-0 mt-2 text-muted small">
                          <strong>Remarks:</strong> {procedure.remarks}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowExitModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resignation Detail Modal */}
      {showDetailModal && selectedResignation && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '800px' }}>
            <div className="modal-content">
              <div className="modal-header bg-light py-2">
                <h6 className="modal-title mb-0">
                  <i className="bi bi-person-badge me-2"></i>
                  {selectedResignation.employee?.firstName || 'Unknown'} {selectedResignation.employee?.lastName || 'Employee'}
                  <span className={`badge ms-2 ${getStatusBadge(selectedResignation.status)}`}>
                    {selectedResignation.status.toUpperCase()}
                  </span>
                </h6>
                <button type="button" className="btn-close" onClick={() => setShowDetailModal(false)}></button>
              </div>
              <div className="modal-body p-3">
                {/* Compact Employee & Resignation Info */}
                <div className="row g-2 mb-2">
                  <div className="col-6">
                    <small className="text-muted d-block">Employee ID</small>
                    <strong>{selectedResignation.employee?.employeeId || 'N/A'}</strong>
                  </div>
                  <div className="col-6">
                    <small className="text-muted d-block">Position</small>
                    <strong>{selectedResignation.employee?.position || 'N/A'}</strong>
                  </div>
                  <div className="col-6">
                    <small className="text-muted d-block">Department</small>
                    <strong>{selectedResignation.employee?.department?.name || 'N/A'}</strong>
                  </div>
                  <div className="col-6">
                    <small className="text-muted d-block">Management Level</small>
                    <span className={`badge ${
                      (selectedResignation.employee?.managementLevel || 0) === 4 ? 'bg-dark' :
                      (selectedResignation.employee?.managementLevel || 0) === 3 ? 'bg-danger' :
                      (selectedResignation.employee?.managementLevel || 0) === 2 ? 'bg-warning' :
                      (selectedResignation.employee?.managementLevel || 0) === 1 ? 'bg-info' : 'bg-primary'
                    }`}>
                      L{selectedResignation.employee?.managementLevel || 0}
                    </span>
                  </div>
                </div>

                <hr className="my-2" />

                {/* Dates */}
                <div className="row g-2 mb-2">
                  <div className="col-4">
                    <small className="text-muted d-block">
                      <i className="bi bi-calendar-event me-1"></i>Resignation Date
                    </small>
                    <small className="fw-bold">{formatDate(selectedResignation.resignationDate)}</small>
                  </div>
                  <div className="col-4">
                    <small className="text-muted d-block">
                      <i className="bi bi-calendar-x me-1"></i>Last Working Date
                    </small>
                    <small className="fw-bold">{formatDate(selectedResignation.lastWorkingDate)}</small>
                  </div>
                  <div className="col-4">
                    <small className="text-muted d-block">Notice Period</small>
                    <small className="fw-bold">
                      {Math.ceil((new Date(selectedResignation.lastWorkingDate) - new Date(selectedResignation.resignationDate)) / (1000 * 60 * 60 * 24))} days
                    </small>
                  </div>
                </div>

                <hr className="my-2" />

                {/* Reason */}
                <div className="mb-2">
                  <small className="text-muted d-block mb-1">
                    <i className="bi bi-chat-left-text me-1"></i>Reason for Resignation
                  </small>
                  <p className="mb-0 p-2 bg-light rounded small">{selectedResignation.reason}</p>
                </div>

                {/* Approval/Rejection Details */}
                {selectedResignation.approvedBy && (
                  <>
                    <hr className="my-2" />
                    <div className="mb-2">
                      <small className="text-muted d-block mb-1">
                        <i className="bi bi-person-check me-1"></i>
                        {selectedResignation.status === 'rejected' ? 'Rejected' : 'Approved'} By
                      </small>
                      <div className="d-flex align-items-center mb-1">
                        <i className="bi bi-person-circle fs-5 me-2 text-primary"></i>
                        <div>
                          <small className="d-block fw-bold">
                            {selectedResignation.approvedBy?.firstName || 'Unknown'} {selectedResignation.approvedBy?.lastName || 'User'}
                          </small>
                          <small className="text-muted">
                            {formatDate(selectedResignation.approvalDate)}
                          </small>
                        </div>
                      </div>
                      {selectedResignation.approvalRemarks && (
                        <div className="p-2 bg-light rounded">
                          <small className="text-muted d-block mb-1">
                            <i className="bi bi-chat-quote me-1"></i>Remarks
                          </small>
                          <small>{selectedResignation.approvalRemarks}</small>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Exit Procedures */}
                {(selectedResignation.status === 'approved' || selectedResignation.status === 'completed') && (
                  <>
                    <hr className="my-2" />
                    <div>
                      <small className="text-muted d-block mb-1">
                        <i className="bi bi-list-check me-1"></i>Exit Procedures
                      </small>
                      <div className="row g-2">
                        {Object.entries(selectedResignation.exitProcedures).map(([key, procedure]) => (
                          <div key={key} className="col-6">
                            <div className={`p-2 rounded border ${procedure.status === 'completed' ? 'border-success bg-success bg-opacity-10' : 'border-secondary bg-light'}`}>
                              <div className="d-flex justify-content-between align-items-center mb-1">
                                <small className="fw-bold text-truncate me-2">
                                  {key.replace(/([A-Z])/g, ' $1').trim().toUpperCase()}
                                </small>
                                <span className={`badge badge-sm ${procedure.status === 'completed' ? 'bg-success' : 'bg-warning'}`} style={{ fontSize: '0.65rem' }}>
                                  {procedure.status.toUpperCase()}
                                </span>
                              </div>
                              {procedure.status === 'completed' && (
                                <>
                                  {procedure.completedBy && (
                                    <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>
                                      <i className="bi bi-person-check me-1"></i>
                                      {procedure.completedBy?.firstName || 'Unknown'} {procedure.completedBy?.lastName || 'User'}
                                    </small>
                                  )}
                                  {procedure.completedDate && (
                                    <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>
                                      <i className="bi bi-calendar-check me-1"></i>
                                      {formatDate(procedure.completedDate)}
                                    </small>
                                  )}
                                  {procedure.remarks && (
                                    <small className="text-muted d-block mt-1 fst-italic" style={{ fontSize: '0.7rem' }}>
                                      <i className="bi bi-chat-dots me-1"></i>
                                      {procedure.remarks}
                                    </small>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                {canManageResignation(selectedResignation) && selectedResignation.status === 'pending' && (
                  <>
                    <button 
                      type="button" 
                      className="btn btn-success"
                      onClick={() => {
                        setShowDetailModal(false);
                        handleStatusUpdate(selectedResignation._id, 'approved');
                      }}
                    >
                      <i className="bi bi-check-lg me-2"></i>Approve
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-danger"
                      onClick={() => {
                        setShowDetailModal(false);
                        handleStatusUpdate(selectedResignation._id, 'rejected');
                      }}
                    >
                      <i className="bi bi-x-lg me-2"></i>Reject
                    </button>
                  </>
                )}
                {!canManageResignation(selectedResignation) && selectedResignation.status === 'pending' && canManage && (
                  <small className="text-muted me-auto">
                    <i className="bi bi-info-circle me-1"></i>
                    Only L4 (CEO/Owner) can approve L3 resignations
                  </small>
                )}
                {canManageResignation(selectedResignation) && (selectedResignation.status === 'approved' || selectedResignation.status === 'completed') && (
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    onClick={() => {
                      setShowDetailModal(false);
                      openExitModal(selectedResignation);
                    }}
                  >
                    <i className="bi bi-list-check me-2"></i>
                    {selectedResignation.status === 'completed' ? 'View Exit Procedures' : 'Manage Exit Procedures'}
                  </button>
                )}
                <button type="button" className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Resignation;
