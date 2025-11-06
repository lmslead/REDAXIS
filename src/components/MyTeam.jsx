import React, { useState, useEffect } from 'react';
import { teamAPI, leaveAPI } from '../services/api';
import { FaUsers, FaCheckCircle, FaTimesCircle, FaHourglassHalf, FaClock, FaChartLine } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './MyTeam.css';

const MyTeam = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [teamStats, setTeamStats] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [selectedLeaves, setSelectedLeaves] = useState([]);
  const [actionType, setActionType] = useState('approve');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch team stats, members, and pending leaves in parallel
      const [statsRes, membersRes, leavesRes] = await Promise.all([
        teamAPI.getTeamStats(),
        teamAPI.getTeamMembers(),
        teamAPI.getTeamLeaves({ status: 'pending' })
      ]);

      setTeamStats(statsRes.data);
      setTeamMembers(membersRes.data || []);
      setPendingLeaves(leavesRes.data || []);
    } catch (err) {
      console.error('Error fetching team data:', err);
      setError(err.message || 'Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveSelection = (leaveId) => {
    setSelectedLeaves(prev => {
      if (prev.includes(leaveId)) {
        return prev.filter(id => id !== leaveId);
      } else {
        return [...prev, leaveId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedLeaves.length === pendingLeaves.length) {
      setSelectedLeaves([]);
    } else {
      setSelectedLeaves(pendingLeaves.map(leave => leave._id));
    }
  };

  const handleBulkAction = async () => {
    if (selectedLeaves.length === 0) {
      setError('Please select at least one leave request');
      return;
    }

    if (!remarks.trim()) {
      setError('Please provide remarks for this action');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccessMessage('');

      const response = await teamAPI.bulkApproveLeaves({
        leaveIds: selectedLeaves,
        status: actionType === 'approve' ? 'approved' : 'rejected',
        remarks: remarks.trim()
      });

      setSuccessMessage(`Successfully ${actionType === 'approve' ? 'approved' : 'rejected'} ${response.data.successful} leave request(s)`);
      setSelectedLeaves([]);
      setRemarks('');
      
      // Refresh data
      await fetchTeamData();
    } catch (err) {
      console.error('Error processing bulk action:', err);
      setError(err.message || 'Failed to process leave requests');
    } finally {
      setLoading(false);
    }
  };

  const handleSingleLeaveAction = async (leaveId, status) => {
    const leaveRemarks = prompt(`Enter remarks for ${status === 'approved' ? 'approving' : 'rejecting'} this leave:`);
    
    if (!leaveRemarks || !leaveRemarks.trim()) {
      setError('Remarks are required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccessMessage('');

      await leaveAPI.updateStatus(leaveId, {
        status,
        remarks: leaveRemarks.trim()
      });

      setSuccessMessage(`Leave request ${status === 'approved' ? 'approved' : 'rejected'} successfully`);
      
      // Refresh data
      await fetchTeamData();
    } catch (err) {
      console.error('Error updating leave status:', err);
      setError(err.message || 'Failed to update leave status');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysCount = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  if (loading && !teamStats) {
    return (
      <div className="my-team-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading team data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-team-container">
      <div className="my-team-header">
        <h1>
          <FaUsers /> My Team
        </h1>
        <div className="header-actions">
          {/* <button className="btn-secondary" onClick={() => navigate('/team-calendar')}>
            <FaClock /> Team Calendar
          </button> */}
          <button className="btn-secondary" onClick={() => navigate('/team-performance')}>
            <FaChartLine /> Performance Report
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          {error}
          <button className="alert-close" onClick={() => setError('')}>×</button>
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success">
          {successMessage}
          <button className="alert-close" onClick={() => setSuccessMessage('')}>×</button>
        </div>
      )}

      {/* Team Statistics Cards */}
      <div className="team-stats-grid">
        <div className="stat-card">
          <div className="stat-icon team-size">
            <FaUsers />
          </div>
          <div className="stat-details">
            <h3>{teamStats?.teamSize || 0}</h3>
            <p>Team Members</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon present">
            <FaCheckCircle />
          </div>
          <div className="stat-details">
            <h3>{teamStats?.todayStats?.present || 0}</h3>
            <p>Present Today</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon absent">
            <FaTimesCircle />
          </div>
          <div className="stat-details">
            <h3>{teamStats?.todayStats?.absent || 0}</h3>
            <p>Absent Today</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon on-leave">
            <FaHourglassHalf />
          </div>
          <div className="stat-details">
            <h3>{teamStats?.todayStats?.onLeave || 0}</h3>
            <p>On Leave Today</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon pending">
            <FaClock />
          </div>
          <div className="stat-details">
            <h3>{teamStats?.pendingLeaves || 0}</h3>
            <p>Pending Approvals</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon attendance-rate">
            <FaChartLine />
          </div>
          <div className="stat-details">
            <h3>{teamStats?.monthlyAttendanceRate ? `${teamStats.monthlyAttendanceRate.toFixed(1)}%` : '0%'}</h3>
            <p>Monthly Attendance</p>
          </div>
        </div>
      </div>

      {/* Pending Leave Requests */}
      <div className="team-section">
        <div className="section-header">
          <h2>Pending Leave Requests ({pendingLeaves.length})</h2>
          {pendingLeaves.length > 0 && (
            <button className="btn-link" onClick={handleSelectAll}>
              {selectedLeaves.length === pendingLeaves.length ? 'Deselect All' : 'Select All'}
            </button>
          )}
        </div>

        {pendingLeaves.length === 0 ? (
          <div className="empty-state">
            <FaCheckCircle />
            <p>No pending leave requests</p>
          </div>
        ) : (
          <>
            <div className="leaves-table-container">
              <table className="leaves-table">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        checked={selectedLeaves.length === pendingLeaves.length}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th>Employee</th>
                    <th>Leave Type</th>
                    <th>Period</th>
                    <th>Days</th>
                    <th>Reason</th>
                    <th>Submitted</th>
                    <th>Deadline</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingLeaves.map(leave => (
                    <tr key={leave._id} className={leave.isEscalated ? 'escalated-row' : ''}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedLeaves.includes(leave._id)}
                          onChange={() => handleLeaveSelection(leave._id)}
                        />
                      </td>
                      <td>
                        <div className="employee-info">
                          <strong>
                            {leave.employee 
                              ? `${leave.employee.firstName || ''} ${leave.employee.lastName || ''}`.trim() 
                              : 'Unknown'}
                          </strong>
                          <small>{leave.employee?.email || leave.employee?.employeeId || ''}</small>
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge-${leave.leaveType}`}>
                          {leave.leaveType?.replace('-', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td>
                        {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                      </td>
                      <td>{getDaysCount(leave.startDate, leave.endDate)}</td>
                      <td className="reason-cell">{leave.reason}</td>
                      <td>{formatDate(leave.createdAt)}</td>
                      <td>
                        {leave.approvalDeadline ? (
                          <span className={`deadline ${new Date(leave.approvalDeadline) < new Date() ? 'overdue' : ''}`}>
                            {formatDate(leave.approvalDeadline)}
                            {leave.isEscalated && <span className="escalated-badge">ESCALATED</span>}
                          </span>
                        ) : '-'}
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn-approve"
                            onClick={() => handleSingleLeaveAction(leave._id, 'approved')}
                            disabled={loading}
                          >
                            Approve
                          </button>
                          <button
                            className="btn-reject"
                            onClick={() => handleSingleLeaveAction(leave._id, 'rejected')}
                            disabled={loading}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bulk Actions Panel */}
            {selectedLeaves.length > 0 && (
              <div className="bulk-actions-panel">
                <div className="bulk-actions-content">
                  <p><strong>{selectedLeaves.length}</strong> leave request(s) selected</p>
                  
                  <div className="bulk-actions-form">
                    <select
                      value={actionType}
                      onChange={(e) => setActionType(e.target.value)}
                      className="form-select"
                    >
                      <option value="approve">Approve</option>
                      <option value="reject">Reject</option>
                    </select>

                    <input
                      type="text"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Enter remarks (required)"
                      className="form-input"
                    />

                    <button
                      className={`btn-bulk ${actionType === 'approve' ? 'btn-approve' : 'btn-reject'}`}
                      onClick={handleBulkAction}
                      disabled={loading || !remarks.trim()}
                    >
                      {actionType === 'approve' ? 'Approve Selected' : 'Reject Selected'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Team Members List */}
      <div className="team-section">
        <h2>Team Members ({teamMembers.length})</h2>
        
        {teamMembers.length === 0 ? (
          <div className="empty-state">
            <FaUsers />
            <p>No team members found</p>
          </div>
        ) : (
          <div className="team-members-grid">
            {teamMembers.map(member => (
              <div key={member._id} className="team-member-card">
                <div className="member-avatar">
                  {member.name?.charAt(0).toUpperCase()}
                </div>
                <div className="member-details">
                  <h3>{member.name}</h3>
                  <p className="member-email">{member.email}</p>
                  <p className="member-role">
                    L{member.managementLevel || 0} - {member.position || 'Employee'}
                  </p>
                  {member.department && (
                    <p className="member-department">
                      {member.department.name}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTeam;
