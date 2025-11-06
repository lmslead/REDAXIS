import { useState, useEffect } from 'react';
import { getUser } from '../services/api';
import './DepartmentManagement.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const getToken = () => localStorage.getItem('token');

const departmentAPI = {
  getAll: async () => {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/departments`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.json();
  },

  create: async (data) => {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/departments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create department');
    }
    return response.json();
  },

  update: async (id, data) => {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/departments/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update department');
    }
    return response.json();
  },

  delete: async (id) => {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/departments/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete department');
    }
    return response.json();
  }
};

const DepartmentManagement = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [newPosition, setNewPosition] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    positions: []
  });

  const currentUser = getUser();
  const canManage = currentUser?.managementLevel >= 3; // Only L3 (Admin) can manage departments

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await departmentAPI.getAll();
      setDepartments(response.data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
      alert('Failed to fetch departments');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (department = null) => {
    if (department) {
      setEditingDepartment(department);
      setFormData({
        name: department.name,
        description: department.description || '',
        positions: department.positions || []
      });
    } else {
      setEditingDepartment(null);
      setFormData({ name: '', description: '', positions: [] });
    }
    setNewPosition('');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingDepartment(null);
    setFormData({ name: '', description: '', positions: [] });
    setNewPosition('');
  };

  const handleAddPosition = () => {
    if (newPosition.trim()) {
      if (formData.positions.includes(newPosition.trim())) {
        alert('Position already exists in this department');
        return;
      }
      setFormData({
        ...formData,
        positions: [...formData.positions, newPosition.trim()]
      });
      setNewPosition('');
    }
  };

  const handleRemovePosition = (position) => {
    setFormData({
      ...formData,
      positions: formData.positions.filter(p => p !== position)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Department name is required');
      return;
    }

    try {
      if (editingDepartment) {
        await departmentAPI.update(editingDepartment._id, formData);
        alert('Department updated successfully!');
      } else {
        await departmentAPI.create(formData);
        alert('Department created successfully!');
      }
      handleCloseModal();
      fetchDepartments();
    } catch (error) {
      alert(error.message || 'Failed to save department');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" department?`)) {
      return;
    }

    try {
      await departmentAPI.delete(id);
      alert('Department deleted successfully!');
      fetchDepartments();
    } catch (error) {
      alert(error.message || 'Failed to delete department');
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
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="row mb-4">
        <div className="col">
          <h2 className="fw-bold">
            <i className="bi bi-building me-2"></i>Department Management
          </h2>
          <p className="text-muted">Manage departments and positions for employee assignment</p>
        </div>
        {canManage && (
          <div className="col-auto">
            <button className="btn btn-primary" onClick={() => handleOpenModal()}>
              <i className="bi bi-plus-circle me-2"></i>Add Department
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="row mb-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="text-muted mb-1">Total Departments</p>
                  <h3 className="fw-bold mb-0">{departments.length}</h3>
                </div>
                <div className="bg-primary bg-opacity-10 p-3 rounded">
                  <i className="bi bi-building text-primary fs-4"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="text-muted mb-1">Active Departments</p>
                  <h3 className="fw-bold mb-0 text-success">
                    {departments.filter(d => d.isActive).length}
                  </h3>
                </div>
                <div className="bg-success bg-opacity-10 p-3 rounded">
                  <i className="bi bi-check-circle text-success fs-4"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="text-muted mb-1">Total Positions</p>
                  <h3 className="fw-bold mb-0 text-info">
                    {departments.reduce((sum, dept) => sum + (dept.positions?.length || 0), 0)}
                  </h3>
                </div>
                <div className="bg-info bg-opacity-10 p-3 rounded">
                  <i className="bi bi-briefcase text-info fs-4"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Departments List */}
      <div className="row">
        {departments.length === 0 ? (
          <div className="col-12 text-center py-5 text-muted">
            <i className="bi bi-building fs-1 d-block mb-2"></i>
            <p>No departments found. Create your first department to get started!</p>
          </div>
        ) : (
          departments.map(department => (
            <div key={department._id} className="col-md-6 col-lg-4 mb-4">
              <div className="card border-0 shadow-sm h-100 department-card">
                <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                  <h6 className="mb-0">
                    <i className="bi bi-building me-2"></i>
                    {department.name}
                  </h6>
                  <span className={`badge ${department.isActive ? 'bg-success' : 'bg-secondary'}`}>
                    {department.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="card-body">
                  {department.description && (
                    <p className="text-muted mb-3">{department.description}</p>
                  )}

                  <div className="mb-3">
                    <small className="text-muted d-block mb-2">
                      <i className="bi bi-briefcase me-1"></i>
                      Positions ({department.positions?.length || 0})
                    </small>
                    {department.positions && department.positions.length > 0 ? (
                      <div className="d-flex flex-wrap gap-1">
                        {department.positions.map((position, index) => (
                          <span key={index} className="badge bg-light text-dark">
                            {position}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <small className="text-muted fst-italic">No positions defined</small>
                    )}
                  </div>

                  <div className="mb-3">
                    <small className="text-muted">
                      <i className="bi bi-people me-1"></i>
                      {department.employees?.length || 0} Employees
                    </small>
                  </div>

                  {canManage && (
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-sm btn-outline-primary flex-fill"
                        onClick={() => handleOpenModal(department)}
                      >
                        <i className="bi bi-pencil me-1"></i>Edit
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDelete(department._id, department.name)}
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Department Modal */}
      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-building me-2"></i>
                  {editingDepartment ? 'Edit Department' : 'Add New Department'}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleCloseModal}
                ></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">
                      Department Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Engineering, Sales, HR"
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description of the department"
                    ></textarea>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">
                      <i className="bi bi-briefcase me-2"></i>Positions
                    </label>
                    <div className="input-group mb-2">
                      <input
                        type="text"
                        className="form-control"
                        value={newPosition}
                        onChange={(e) => setNewPosition(e.target.value)}
                        placeholder="e.g., Software Engineer, Manager"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddPosition();
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleAddPosition}
                      >
                        <i className="bi bi-plus-lg"></i> Add
                      </button>
                    </div>

                    {formData.positions.length > 0 ? (
                      <div className="border rounded p-3 bg-light">
                        <small className="text-muted d-block mb-2">
                          {formData.positions.length} position(s) added:
                        </small>
                        <div className="d-flex flex-wrap gap-2">
                          {formData.positions.map((position, index) => (
                            <span
                              key={index}
                              className="badge bg-primary d-flex align-items-center gap-1"
                              style={{ fontSize: '0.9rem' }}
                            >
                              {position}
                              <i
                                className="bi bi-x-circle"
                                style={{ cursor: 'pointer' }}
                                onClick={() => handleRemovePosition(position)}
                              ></i>
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <small className="text-muted fst-italic">
                        No positions added yet. Add positions that belong to this department.
                      </small>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCloseModal}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <i className="bi bi-check-lg me-2"></i>
                    {editingDepartment ? 'Update Department' : 'Create Department'}
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

export default DepartmentManagement;
