import { useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import './Profile.css';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  
  // Only L3 (Admin) and L4 (CEO/Owner) can edit their profile
  const canEditProfile = user?.managementLevel >= 3;
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
    },
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await authAPI.getMe();
      setUser(response.data);
      setFormData({
        firstName: response.data.firstName,
        lastName: response.data.lastName,
        phone: response.data.phone || '',
        address: response.data.address || {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: '',
        },
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await authAPI.updateProfile(formData);
      alert('Profile updated successfully!');
      setEditMode(false);
      fetchUserProfile();
    } catch (error) {
      alert(error.message || 'Update failed');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match!');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      alert('Password must be at least 6 characters long!');
      return;
    }

    try {
      await authAPI.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      alert('Password changed successfully!');
      setShowPasswordModal(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      alert(error.message || 'Password change failed');
    }
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
    <div className="container py-4">
      <div className="row mb-4">
        <div className="col">
          <h2 className="fw-bold">My Profile</h2>
          <p className="text-muted">Manage your personal information</p>
        </div>
        <div className="col-auto">
          {canEditProfile ? (
            !editMode ? (
              <button className="btn btn-primary" onClick={() => setEditMode(true)}>
                <i className="bi bi-pencil me-2"></i>Edit Profile
              </button>
            ) : (
              <button className="btn btn-secondary" onClick={() => { setEditMode(false); fetchUserProfile(); }}>
                <i className="bi bi-x-circle me-2"></i>Cancel
              </button>
            )
          ) : (
            <div className="alert alert-info mb-0 py-2 px-3">
              <i className="bi bi-info-circle me-2"></i>
              Only L3 (Admin) and L4 (CEO/Owner) can edit their profile
            </div>
          )}
        </div>
      </div>

      <div className="row">
        {/* Profile Card */}
        <div className="col-md-4 mb-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center py-5">
              <img
                src={user?.profileImage || '/assets/client.jpg'}
                alt="Profile"
                className="rounded-circle mb-3"
                style={{ width: '120px', height: '120px', objectFit: 'cover' }}
              />
              <h5 className="fw-bold mb-1">{user?.firstName} {user?.lastName}</h5>
              <p className="text-muted mb-2">{user?.position || 'Employee'}</p>
              <span className={`badge ${
                user?.managementLevel === 4 ? 'bg-dark' :
                user?.managementLevel === 3 ? 'bg-danger' :
                user?.managementLevel === 2 ? 'bg-warning' :
                user?.managementLevel === 1 ? 'bg-info' : 'bg-primary'
              } mb-3`}>
                LEVEL {user?.managementLevel || 0} - {
                  user?.managementLevel === 4 ? 'CEO/OWNER' :
                  user?.managementLevel === 3 ? 'ADMIN' :
                  user?.managementLevel === 2 ? 'SR. MANAGER' :
                  user?.managementLevel === 1 ? 'MANAGER' : 'EMPLOYEE'
                }
              </span>
              
              <div className="d-grid gap-2 mt-4">
                <button 
                  className="btn btn-outline-primary"
                  onClick={() => setShowPasswordModal(true)}
                >
                  <i className="bi bi-key me-2"></i>Change Password
                </button>
              </div>
            </div>
          </div>

          {/* Quick Info Card */}
          <div className="card border-0 shadow-sm mt-3">
            <div className="card-body">
              <h6 className="fw-bold mb-3">Quick Info</h6>
              <div className="mb-3">
                <small className="text-muted d-block">Employee ID</small>
                <strong>{user?.employeeId}</strong>
              </div>
              <div className="mb-3">
                <small className="text-muted d-block">Department</small>
                <strong>{user?.department?.name || 'N/A'}</strong>
              </div>
              <div className="mb-3">
                <small className="text-muted d-block">Joining Date</small>
                <strong>{user?.joiningDate ? new Date(user.joiningDate).toLocaleDateString() : 'N/A'}</strong>
              </div>
              <div>
                <small className="text-muted d-block">Status</small>
                <span className={`badge ${
                  user?.status === 'active' ? 'bg-success' :
                  user?.status === 'on-leave' ? 'bg-warning' : 'bg-secondary'
                }`}>
                  {user?.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Details */}
        <div className="col-md-8">
          {!canEditProfile && (
            <div className="alert alert-warning mb-3" role="alert">
              <i className="bi bi-lock me-2"></i>
              <strong>Profile Editing Restricted:</strong> Only L3 (Admin) and L4 (CEO/Owner) users can edit their profile information. Please contact your administrator if you need to update your details.
            </div>
          )}
          
          <form onSubmit={handleUpdateProfile}>
            <div className="card border-0 shadow-sm mb-3">
              <div className="card-body">
                <h6 className="fw-bold mb-3">Personal Information</h6>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">First Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.firstName}
                      onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                      disabled={!editMode}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Last Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.lastName}
                      onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                      disabled={!editMode}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={user?.email}
                      disabled
                    />
                    <small className="text-muted">Email cannot be changed</small>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Phone</label>
                    <input
                      type="tel"
                      className="form-control"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      disabled={!editMode}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Date of Birth</label>
                    <input
                      type="date"
                      className="form-control"
                      value={user?.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : ''}
                      disabled
                    />
                    <small className="text-muted">Contact HR to update</small>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Position</label>
                    <input
                      type="text"
                      className="form-control"
                      value={user?.position || ''}
                      disabled
                    />
                    <small className="text-muted">Contact HR to update</small>
                  </div>
                </div>
              </div>
            </div>

            {/* Identity Documents Card */}
            <div className="card border-0 shadow-sm mb-3">
              <div className="card-body">
                <h6 className="fw-bold mb-3">Identity Documents</h6>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">PAN Card</label>
                    <input
                      type="text"
                      className="form-control"
                      value={user?.panCard || 'Not Provided'}
                      disabled
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Aadhar Card</label>
                    <input
                      type="text"
                      className="form-control"
                      value={user?.aadharCard || 'Not Provided'}
                      disabled
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Hierarchy & Permissions Card */}
            <div className="card border-0 shadow-sm mb-3">
              <div className="card-body">
                <h6 className="fw-bold mb-3">Hierarchy & Permissions</h6>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Management Level</label>
                    <input
                      type="text"
                      className="form-control"
                      value={`L${user?.managementLevel || 0} - ${
                        user?.managementLevel === 4 ? 'CEO/Owner' :
                        user?.managementLevel === 3 ? 'Admin' :
                        user?.managementLevel === 2 ? 'Senior Manager' :
                        user?.managementLevel === 1 ? 'Manager' : 'Employee'
                      }`}
                      disabled
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Reporting Manager</label>
                    <input
                      type="text"
                      className="form-control"
                      value={user?.reportingManager ? `${user.reportingManager.firstName} ${user.reportingManager.lastName}` : 'No Manager'}
                      disabled
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Can Approve Leaves</label>
                    <input
                      type="text"
                      className="form-control"
                      value={user?.canApproveLeaves ? 'Yes' : 'No'}
                      disabled
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Can Manage Attendance</label>
                    <input
                      type="text"
                      className="form-control"
                      value={user?.canManageAttendance ? 'Yes' : 'No'}
                      disabled
                    />
                  </div>
                  <div className="col-md-12">
                    <label className="form-label">Saturday Work Schedule</label>
                    <input
                      type="text"
                      className="form-control"
                      value={user?.saturdayWorking ? 'Working Saturday' : 'Saturday is Off'}
                      disabled
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Assets Allocated Card */}
            <div className="card border-0 shadow-sm mb-3">
              <div className="card-body">
                <h6 className="fw-bold mb-3">Assets Allocated</h6>
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label">Allocated Assets</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={user?.assetsAllocated || 'No assets allocated'}
                      disabled
                    />
                    <small className="text-muted">Contact HR or Admin to update assets</small>
                  </div>
                </div>
              </div>
            </div>

            {/* Salary Information Card */}
            <div className="card border-0 shadow-sm mb-3">
              <div className="card-body">
                <h6 className="fw-bold mb-3">Salary Information</h6>
                <div className="row g-3">
                  <div className="col-md-12">
                    <label className="form-label">Gross Salary</label>
                    <input
                      type="text"
                      className="form-control"
                      value={user?.salary?.grossSalary ? `₹${Number(user.salary.grossSalary).toLocaleString()}` : 'Not Set'}
                      disabled
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Banking Details Card */}
            <div className="card border-0 shadow-sm mb-3">
              <div className="card-body">
                <h6 className="fw-bold mb-3">Banking Details</h6>
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label">Account Number</label>
                    <input
                      type="text"
                      className="form-control"
                      value={user?.bankDetails?.accountNumber || 'Not Provided'}
                      disabled
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Bank Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={user?.bankDetails?.bankName || 'Not Provided'}
                      disabled
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">IFSC Code</label>
                    <input
                      type="text"
                      className="form-control"
                      value={user?.bankDetails?.ifscCode || 'Not Provided'}
                      disabled
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Compliance Details Card */}
            <div className="card border-0 shadow-sm mb-3">
              <div className="card-body">
                <h6 className="fw-bold mb-3">Compliance Details</h6>
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label">UAN Number</label>
                    <input
                      type="text"
                      className="form-control"
                      value={user?.complianceDetails?.uanNumber || 'Not Provided'}
                      disabled
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">PF Number</label>
                    <input
                      type="text"
                      className="form-control"
                      value={user?.complianceDetails?.pfNumber || 'Not Provided'}
                      disabled
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">ESI Number</label>
                    <input
                      type="text"
                      className="form-control"
                      value={user?.complianceDetails?.esiNumber || 'Not Provided'}
                      disabled
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <h6 className="fw-bold mb-3">Address Information</h6>
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label">Street Address</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.address.street}
                      onChange={(e) => setFormData({...formData, address: {...formData.address, street: e.target.value}})}
                      disabled={!editMode}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">City</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.address.city}
                      onChange={(e) => setFormData({...formData, address: {...formData.address, city: e.target.value}})}
                      disabled={!editMode}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">State</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.address.state}
                      onChange={(e) => setFormData({...formData, address: {...formData.address, state: e.target.value}})}
                      disabled={!editMode}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Zip Code</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.address.zipCode}
                      onChange={(e) => setFormData({...formData, address: {...formData.address, zipCode: e.target.value}})}
                      disabled={!editMode}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Country</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.address.country}
                      onChange={(e) => setFormData({...formData, address: {...formData.address, country: e.target.value}})}
                      disabled={!editMode}
                    />
                  </div>
                </div>
              </div>
            </div>

            {editMode && (
              <div className="mt-3 d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-secondary" onClick={() => { setEditMode(false); fetchUserProfile(); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Change Password</h5>
                <button type="button" className="btn-close" onClick={() => { setShowPasswordModal(false); setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' }); }}></button>
              </div>
              <form onSubmit={handleChangePassword}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Current Password</label>
                    <input
                      type="password"
                      className="form-control"
                      required
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">New Password</label>
                    <input
                      type="password"
                      className="form-control"
                      required
                      minLength="6"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                    />
                    <small className="text-muted">At least 6 characters</small>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Confirm New Password</label>
                    <input
                      type="password"
                      className="form-control"
                      required
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowPasswordModal(false); setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' }); }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Change Password
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

export default Profile;
