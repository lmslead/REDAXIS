import { useState, useEffect } from 'react';
import { assetsAPI, employeesAPI } from '../services/api';
import { getUser } from '../services/api';
import './Assets.css';

const Assets = () => {
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [assetName, setAssetName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  const currentUser = getUser();
  const canManage = currentUser?.managementLevel >= 1;

  useEffect(() => {
    fetchAssets();
    if (canManage) {
      fetchEmployees();
    }
  }, [canManage]);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const response = await assetsAPI.getAll();
      setAssets(response.data || []);
    } catch (error) {
      console.error('Failed to fetch assets:', error);
      alert(error.message || 'Failed to fetch assets');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await employeesAPI.getAll();
      setEmployees(response.data || []);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const handleAddAsset = async (e) => {
    e.preventDefault();
    if (!selectedEmployee || !assetName.trim()) {
      alert('Please select an employee and enter an asset name');
      return;
    }

    try {
      await assetsAPI.addAsset(selectedEmployee, { assetName: assetName.trim() });
      alert('Asset allocated successfully!');
      setShowModal(false);
      setSelectedEmployee('');
      setAssetName('');
      fetchAssets();
    } catch (error) {
      alert(error.message || 'Failed to allocate asset');
    }
  };

  const handleRevokeAsset = async (employeeId, assetId) => {
    if (window.confirm('Are you sure you want to revoke this asset?')) {
      try {
        await assetsAPI.revokeAsset(employeeId, assetId);
        alert('Asset revoked successfully!');
        fetchAssets();
      } catch (error) {
        alert(error.message || 'Failed to revoke asset');
      }
    }
  };

  // Filter and search assets
  const filteredAssets = assets.filter(emp => {
    const matchesSearch = emp.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emp.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emp.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const hasMatchingAsset = emp.assets?.some(asset => {
      const matchesStatus = filterStatus === 'all' || asset.status === filterStatus;
      const matchesAssetName = asset.name?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && (matchesAssetName || matchesSearch);
    });
    
    return hasMatchingAsset || (matchesSearch && emp.assets?.length > 0);
  });

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="assets-container">
      <div className="assets-header">
        <h2 className="mb-0">Assets Management</h2>
        {canManage && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <i className="bi bi-plus-circle me-2"></i>
            Allocate Asset
          </button>
        )}
      </div>

      <div className="assets-filters">
        <div className="row g-3 align-items-end">
          <div className="col-md-6">
            <label className="form-label">Search</label>
            <input
              type="text"
              className="form-control"
              placeholder="Search by employee name, ID, or asset name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label">Status Filter</label>
            <select 
              className="form-select" 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Assets</option>
              <option value="active">Active</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>
          <div className="col-md-3">
            <div className="stats-badge">
              <strong>{filteredAssets.reduce((acc, emp) => acc + (emp.assets?.length || 0), 0)}</strong>
              <span>Total Assets</span>
            </div>
          </div>
        </div>
      </div>

      {filteredAssets.length === 0 ? (
        <div className="text-center py-5">
          <i className="bi bi-inbox display-1 text-muted"></i>
          <p className="text-muted mt-3">No assets found</p>
        </div>
      ) : (
        <div className="assets-list">
          {filteredAssets.map((employee) => (
            <div key={employee._id} className="employee-asset-card">
              <div className="employee-header">
                <div className="employee-info">
                  <h5 className="mb-1">
                    {employee.firstName} {employee.lastName}
                    <span className="badge bg-secondary ms-2">{employee.employeeId}</span>
                  </h5>
                  <p className="text-muted mb-0">
                    {employee.position} • {employee.department?.name}
                  </p>
                </div>
                <div className="asset-count">
                  <span className="badge bg-primary rounded-pill">
                    {employee.assets?.filter(a => a.status === 'active').length || 0} Active
                  </span>
                  {employee.assets?.filter(a => a.status === 'revoked').length > 0 && (
                    <span className="badge bg-secondary rounded-pill ms-2">
                      {employee.assets.filter(a => a.status === 'revoked').length} Revoked
                    </span>
                  )}
                </div>
              </div>

              <div className="assets-grid">
                {employee.assets?.map((asset) => (
                  <div key={asset._id} className={`asset-item ${asset.status}`}>
                    <div className="asset-details">
                      <div className="asset-name">
                        <i className="bi bi-laptop me-2"></i>
                        {asset.name}
                      </div>
                      <div className="asset-meta">
                        <span className={`status-badge ${asset.status}`}>
                          {asset.status === 'active' ? (
                            <><i className="bi bi-check-circle me-1"></i>Active</>
                          ) : (
                            <><i className="bi bi-x-circle me-1"></i>Revoked</>
                          )}
                        </span>
                        <span className="asset-date">
                          Allocated: {new Date(asset.allocatedDate).toLocaleDateString()}
                        </span>
                        {asset.status === 'revoked' && asset.revokedDate && (
                          <span className="asset-date">
                            Revoked: {new Date(asset.revokedDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className="asset-by">
                        By: {asset.allocatedBy?.firstName} {asset.allocatedBy?.lastName}
                        {asset.status === 'revoked' && asset.revokedBy && (
                          <> • Revoked by: {asset.revokedBy.firstName} {asset.revokedBy.lastName}</>
                        )}
                      </div>
                    </div>
                    {canManage && asset.status === 'active' && (
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleRevokeAsset(employee._id, asset._id)}
                        title="Revoke Asset"
                      >
                        <i className="bi bi-x-circle"></i>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Asset Modal */}
      {showModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Allocate Asset</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleAddAsset}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Select Employee *</label>
                    <select
                      className="form-select"
                      value={selectedEmployee}
                      onChange={(e) => setSelectedEmployee(e.target.value)}
                      required
                    >
                      <option value="">Choose employee...</option>
                      {employees.map((emp) => (
                        <option key={emp._id} value={emp._id}>
                          {emp.firstName} {emp.lastName} ({emp.employeeId})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Asset Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g., Laptop HP EliteBook, iPhone 13, Monitor Dell 24'..."
                      value={assetName}
                      onChange={(e) => setAssetName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Allocate Asset
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

export default Assets;
